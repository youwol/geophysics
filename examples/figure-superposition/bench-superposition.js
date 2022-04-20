/**
 * Invert for the far field stress + 1 pressure ina cavity
 */
const io  = require('@youwol/io')
const df  = require('@youwol/dataframe')
const geo = require('../../dist/@youwol/geophysics')
const fs  = require('fs')
const cpu = require('process')
const geom = require('../../../geometry/dist/@youwol/geometry')
const arch = require('../../../../../platform/components/arch-node/build/Release/arch.node')

function superposition() {
    const dataframe  = io.decodeGocadTS( fs.readFileSync('/Users/fmaerten/data/arch/figure-superposition/simulations.ts', 'utf8') )[0]

    console.log("nb points", dataframe.series.positions.count)

    const startUsage = cpu.cpuUsage()

    const n = 10000
    const alpha = [72,  2,   11,  110,  100, 1,   5,  3 ]

    for (let i=0; i<n; ++i) {
        const U = geo.forward.attribute({
            simulations: dataframe,
            name: 'U',
            alpha,
            startIndex: 1
        })
    }

    console.log( cpu.cpuUsage(startUsage).user/n/1000, 'ms / evaluation' )
}

function forward() {
    const model = new arch.Model()
    model.setMaterial ( 0.25, 1, 1 )
    model.setHalfSpace( true )

    const dataframe  = io.decodeGocadTS( fs.readFileSync('/Users/fmaerten/data/arch/figure-superposition/s1.ts', 'utf8') )[0]
    const positions  = dataframe.series.positions
    const indices    = dataframe.series.indices
    const chamber = new arch.Surface(dataframe.series.positions.array, dataframe.series.indices.array)
    chamber.setBC("dip",    "free", 0)
    chamber.setBC("strike", "free", 0)
    chamber.setBC("normal", "free", 0)
    model.addSurface( chamber )

    const remote = new arch.UserRemote()
    model.addRemote( remote )

    const bounds = model.bounds()
    const d = Math.max(bounds[3]-bounds[0], bounds[4]-bounds[1])

    const grid = geom.generateRectangle({
        a: 2*d,
        b: 2*d, 
        na: 50, 
        nb: 50, 
        center: [(bounds[3]+bounds[0])/2, (bounds[4]+bounds[1])/2, 0] // at z=0
    })
    const obs = grid.series['positions'].array

    const startUsage = cpu.cpuUsage()

    const solution = new arch.Solution(model)
    const U = df.Serie.create({array: solution.displ(obs), itemSize: 3})

    console.log( cpu.cpuUsage(startUsage).user/1000, 'ms' )
}

forward()
