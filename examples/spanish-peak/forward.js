const io     = require('@youwol/io')
const df     = require('@youwol/dataframe')
const geo    = require('../../dist/@youwol/geophysics')
const fs     = require('fs')
const arch   = require('../../../../../platform/components/arch-node/build/Release/arch.node')

const path  = '/Users/fmaerten/data/arch/spanish-peak'

// const userAlpha = [
//     73.40670022620058,
//     0.23693485229132216,
//     0.24906788191671625,
//     2000,
//     2519.6261347258883,
//     -43571623.71780121
// ]

// const userAlpha = [
//     138.02132781450015,
//     0.640142981967041,
//     0.6329640790081879,
//     2900,
//     2136.248138385615,
//     39400121.026311964
// ]


/*
// FROM Laurent
// From https://drive.google.com/drive/folders/1KA1RvRMYrLAZVt4Y_VgBxEkSrSbF8DDt
Rsalt	= 2600.0 ;			// average salt density (kg/m3)
Rsed	= 2900.0 ;			// average sediment density (kg/m3)
nu		= 0.25 ;			// Poisson's ratio
E		= 30e9 ;			// Young's modulus (Pa)
theta	= 76.75 ;			// orientation of SH from North to the East (degree)
shift	= 3697912 ;			// salt pressure shift (Pa), -10e8 <shift< +10e8
Kh		= 0.00667 ;			// Kh=Sh/Sv => fixed for the inversion
KH		= 0.02172 ;			// KH=SH/Sv => with Rb=0.57=(SH-Sh)/(Sv-Sh)
*/
const userAlpha = [
    76.75,
    0.00667,
    0.02172,
    2900,
    2600,
    3697912
]

// const userAlpha = [
//     98.83978014393253,
//     0.5473587611766761,
//     0.5573640531559534,
//     2900,
//     2600,
//     90468655.13962206
// ]

const model = new arch.Model()
model.setMaterial ( 0.25, 30e9, 2900 )
model.setHalfSpace( true )

const alpha = geo.gradientPressureMapping( userAlpha )

console.log('user-alpha:', userAlpha)
console.log('alpha:', alpha)

// Discontinuity (sphere)
const surfs = io.decodeGocadTS( fs.readFileSync(path+'/volcano.ts', 'utf8'), {repair: false} )
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

const grid = io.decodeGocadTS( fs.readFileSync(path+'/2D_grid.ts', 'utf8') )[0]
const obs  = grid.series['positions'].array
grid.series['U']     = df.Serie.create({array: solution.displ(obs) , itemSize: 3})    
grid.series['S']     = df.Serie.create({array: solution.stress(obs), itemSize: 6})
grid.series['Joint'] = geo.generateJoints({stress: grid.series['S'], projected: true})//.map( v => [v[1], -v[0], 0])

fs.writeFileSync(path+'/forward-grid.ts', io.encodeGocadTS(grid, {
    expandAttributes: true
}), 'utf8')