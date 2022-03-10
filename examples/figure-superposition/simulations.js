// !!! Pas touche les 4 lignes suivantes
const arch = require('../../../../../platform/components/arch-node/build/Release/arch.node')
const io   = require('@youwol/io')
const df   = require('@youwol/dataframe')
const math = require('@youwol/math')
const geom = require('../../../geometry/dist/@youwol/geometry')
const fs   = require('fs')
let params = require('./user-params')

function addDiscon(file, model) {
    const dataframe  = io.decodeGocadTS( fs.readFileSync(file, 'utf8') )[0]
    const positions  = dataframe.series.positions
    const indices    = dataframe.series.indices

    const chamber = new arch.Surface(positions.array, indices.array)
    chamber.setBC("dip",    "free", 0)
    chamber.setBC("strike", "free", 0)
    chamber.setBC("normal", "free", 0)
    model.addSurface( chamber )

    console.log(indices.count)

    return chamber
}

const model = new arch.Model()
model.setMaterial ( params.nu, params.E, params.rockDensity )
model.setHalfSpace( params.halspace )

const chambers = []
chambers.push( addDiscon('/Users/fmaerten/data/arch/figure-superposition/s1.ts', model) )
chambers.push( addDiscon('/Users/fmaerten/data/arch/figure-superposition/chamber-modif.ts', model) )

const remote = new arch.UserRemote()
model.addRemote( remote )

const solver = new arch.Forward(model, 'seidel', params.tol, params.maxIter)
solver.setAutoReleaseMemory(false)

// ------------------------------------------------

// [minX, minY, minZ, maxX, maxY, maxZ]
const bounds = model.bounds()
const d = Math.max(bounds[3]-bounds[0], bounds[4]-bounds[1])

const grid = geom.generateRectangle({
    a: 2*d,
    b: 2*d, 
    na: params.nx, 
    nb: params.ny, 
    center: [(bounds[3]+bounds[0])/2, (bounds[4]+bounds[1])/2, 0] // at z=0
})
const obs = grid.series['positions'].array

// [xx, xy, xz, yy, yz, zz, density, shift]
const nbSimulations = 8

const doSimulation = index => {
    const alpha = new Array(nbSimulations).fill(0).map( (v,i) => i===(index-1) ? 1 : 0 )
    console.log(`=======> Doing simulation  + ${alpha}` )

    remote.setFunction( (x,y,z) => {
        return [
            alpha[0]*Math.abs(z), // xx
            alpha[1]*Math.abs(z), // xy
            alpha[2]*Math.abs(z), // xz
            alpha[3]*Math.abs(z), // yy
            alpha[4]*Math.abs(z), // yz
            alpha[5]*Math.abs(z)  // zz
        ]
    })
    // Pressure in the cavity
    chambers.forEach( c => c.setBC( "normal", "free", (x,y,z) => alpha[6]*params.g*Math.abs(z) + alpha[7] ) )

    solver.run()
    const solution = new arch.Solution(model)
    grid.series[`U${index}`]  = df.Serie.create({array: solution.displ(obs), itemSize: 3})
    grid.series[`S${index}`] = df.Serie.create({array: solution.stress(obs), itemSize: 6})
}

for (let i=1; i<=nbSimulations; ++i) {
    doSimulation(i)
}

const bufferOut = io.encodeGocadTS(grid, {userData: {
    'nbSimuls': 8,
    'startIndex': 1,
    'order': ['xx', 'xy', 'xz', 'yy', 'yz', 'zz', 'density', 'shift'],
    'computed': ['displ', 'stress']
}})
fs.writeFile('/Users/fmaerten/data/arch/figure-superposition/simulations.ts', bufferOut, 'utf8', err => {})
