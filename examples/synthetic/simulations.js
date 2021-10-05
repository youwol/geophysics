// !!! Pas touche les 4 lignes suivantes
const Module = require('@youwol/arch')
const io     = require('@youwol/io')
const df     = require('@youwol/dataframe')
const geom   = require('@youwol/geometry')
const math   = require('@youwol/math')
const geop   = require('../../dist/@youwol/geophysics')
const fs     = require('fs')
const { exit } = require('process')

let {positions, indices, grid, printProgress} = require('./utils')
let params = require('./user-params')

Module().then( arch => {
    const model = new arch.Model()
    model.setMaterial ( new arch.Material(params.nu, params.E, params.rockDensity) )
    model.setHalfSpace( false )
    
    const chamber = new arch.Surface(positions.array, indices.array)
    chamber.setBC("dip",    "free", 0)
    chamber.setBC("strike", "free", 0)
    chamber.setBC("normal", "free", 0)
    model.addSurface( chamber )
   
    const remote = new arch.UserRemote()
    model.addRemote( remote )

    const solver = new arch.Solver(model, 'seidel', params.tol, params.maxIter)
    solver.onMessage( c => console.log(c) )
    solver.onEnd( c => console.log('') )
    solver.onProgress( (i, c, context) => {
        context === 1 ? printProgress("building system: " + (c+1).toFixed(0) + "%") : printProgress("iter " + i + ": residual " + c.toFixed(7))
        
    })
    solver.setAutoReleaseMemory(false)

    const nbSimulations = 6

    const obs = grid.series['positions'].array

    const resetBurgers = new Array(chamber.nbTriangles*3).fill(0)

    // [xx, xy, yy, zz, density, shift]
    const doSimulation = index => {
        const alpha = new Array(nbSimulations).fill(0).map( (v,i) => i===(index-1) ? 1 : 0 )
        console.log('=======> Doing simulation ' + alpha + " at index " + index)

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

        chamber.setDisplFromTriangles(resetBurgers) // set init burgers to 0 (we never know)

        chamber.setBC("normal", "free", (x,y,z) => {
            return alpha[4]*params.g*Math.abs(z) + alpha[5]
        })

        const solution = solver.run()
        
        solution.onMessage( c => console.log(c) )
        solution.onEnd( c => console.log('') )
        solution.onProgress( (i,p) => printProgress(`nb-pts so far: ${i}, realized: ${p.toFixed(0)}%`))

        // Compute displ and put it in a grid
        const displ = df.Serie.create({array: solution.displ(obs), itemSize: 3})
        const m = math.minMax(displ)
        console.log('dx=',m[3]-m[0],' dy=', m[4]-m[1],' dz=', m[5]-m[2])
        grid.series[`displ${index}`] = displ
    }

    for (let i=1; i<=nbSimulations; ++i) {
        doSimulation(i)
    }

    const bufferOut = io.encodeGocadTS(grid)
    fs.writeFile('simulations.gcd', bufferOut, 'utf8', err => {})
})
