const io     = require('@youwol/io')
const df     = require('@youwol/dataframe')
const geo    = require('../../../dist/@youwol/geophysics')
const fs     = require('fs')
const arch   = require('../../../../../../platform/components/arch-node/build/Release/arch.node')

const path  = '/Users/fmaerten/data/arch/galapagos-all/model2'

const userAlpha = [
    34.50256084887867,
    0.2524466216086094,
    0.2431850567279068,
    2900,
    2196.4765842190345,
    73864335.79676998
]

// const userAlpha = [
//     88.70277320134204,
//     0.289626454513602,
//     0.27652131795517354,
//     2000,
//     2636.678946920763,
//     -26271214.45694685,
//     -16343412.574861467,
//     -43135106.79548411,
//     92235990.41073596,
//     -29981543.92938979,
//     -24976448.75269583,
//     -47213423.807596035
// ]

const model = new arch.Model()
model.setMaterial ( 0.25, 30e9, 2000 )
model.setHalfSpace( false )

const alpha = geo.gradientPressureMapping( userAlpha )

// Discontinuity (sphere)
const surfs = io.decodeGocadTS( fs.readFileSync(path+'/all_magma_chambers_600_georef.ts', 'utf8'), {repair: false} )
const chambers = []
surfs.forEach( (surf, i) => {
    const chamber = new arch.Surface(surf.series.positions.array, surf.series.indices.array)
    chamber.setBC("dip",    "free", 0)
    chamber.setBC("strike", "free", 0)
    if (alpha.length>6) {
        chamber.setBC("normal", "free", (x,y,z) => alpha[4]*9.81*Math.abs(z) + alpha[5+i] )
    }
    else {
        chamber.setBC("normal", "free", (x,y,z) => alpha[4]*9.81*Math.abs(z) + alpha[5] )
    }
    chambers.push(chamber)
    model.addSurface( chamber )
})

// Remote
const remote = new arch.UserRemote()
remote.setFunction( (x,y,z) => {
    const Z = Math.abs(z)
    return [alpha[0]*Z, alpha[1]*Z, 0, alpha[2]*Z, 0, alpha[3]*Z]
})
model.addRemote( remote )

// Solver
const solver = new arch.Solver(model)
solver.select("parallel")
solver.setNbCores(10)
solver.setMaxIter(1000)
solver.setEps(1e-9)
solver.run()

// Post-process
const solution = new arch.Solution(model)
solution.setNbCores(10)

const grid = io.decodeGocadTS( fs.readFileSync(path+'/grid.ts', 'utf8') )[0]
const obs  = grid.series['positions'].array
grid.series['U']     = df.Serie.create({array: solution.displ(obs) , itemSize: 3})    
grid.series['S']     = df.Serie.create({array: solution.stress(obs), itemSize: 6})
grid.series['Joint'] = geo.generateJoints({stress: grid.series['S'], projected: false}).map( v => [v[1], -v[0], 0])

fs.writeFileSync(path+'/forward-grid.ts', io.encodeGocadTS(grid, {
    expandAttributes: true
}), 'utf8')