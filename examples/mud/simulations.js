// !!! Pas touche les 4 lignes suivantes
const Module = require('@youwol/arch')
const io     = require('@youwol/io')
const df     = require('@youwol/dataframe')
const geom   = require('@youwol/geometry')
const math   = require('@youwol/math')
const geop   = require('../../dist/@youwol/geophysics')
const fs     = require('fs')
const { exit } = require('process')

let {printProgress} = require('./utils')
let params = require('./user-params')

const mud = io.decodeGocadTS( fs.readFileSync('./Mud_Volcano_top_cut_remeshed_1315.gcd', 'utf8') )[0]
const minMax = math.minMax( mud.series['positions'] )
let grid = io.decodeGocadTS( fs.readFileSync('./grid.gcd', 'utf8') )[0]

Module().then( arch => {
    const model = new arch.Model()
    model.setMaterial ( new arch.Material(params.nu, params.E, params.rockDensity) )
    model.setHalfSpace( false )
    
    const chamber = new arch.Surface(mud.series['positions'].array, mud.series['indices'].array)
    chamber.setBC("dip",    "free", 0)
    chamber.setBC("strike", "free", 0)
    //chamber.setBC("normal", "free", 0)
    model.addSurface( chamber )
   
    const remote = new arch.UserRemote()
    model.addRemote( remote )

    const solver = new arch.Solver(model, 'seidel', params.tol, params.maxIter)
    solver.setAutoReleaseMemory(false)

    const obs = grid.series['positions'].array

    // [xx, xy, yy, zz, density, shift]
    const nbSimulations = 6

    const doSimulation = index => {
        const alpha = new Array(nbSimulations).fill(0).map( (v,i) => i===(index-1) ? 1 : 0 )
        console.log(`=======> Doing simulation  + ${alpha}` )

        remote.func = (x,y,z) => {
            return [
                alpha[0]*Math.abs(z), // xx 
                alpha[1]*Math.abs(z), // xy
                0,                    // xz
                alpha[2]*Math.abs(z), // yy
                0,                    // yz
                alpha[3]*Math.abs(z)  // zz
            ]
        }
        // Pressure in the cavity
        chamber.setBC( "normal", "free", (x,y,z) => alpha[4]*params.g*Math.abs(z) + alpha[5] )

        const solution = solver.run()
        grid.series[`displ${index}`]  = df.Serie.create({array: solution.displ(obs), itemSize: 3})
        grid.series[`stress${index}`] = df.Serie.create({array: solution.stress(obs), itemSize: 6})
    }

    for (let i=1; i<=nbSimulations; ++i) {
        doSimulation(i)
    }

    const bufferOut = io.encodeGocadTS(grid, {userData: {
        'nbSimuls': 6,
        'startIndex': 1,
        'order': ['xx', 'xy', 'yy', 'zz', 'density', 'shift'],
        'computed': ['displ', 'stress']
    }})
    fs.writeFile('simulations.gcd', bufferOut, 'utf8', err => {})
})
