/**
 * Inverst for the far field stress + 1 pressure in the Fernandina
 * magma chamber
 */
const io = require('@youwol/io')
const df = require('@youwol/dataframe')
const math = require('@youwol/math')
const geo = require('../../dist/@youwol/geophysics')
const fs = require('fs')
const arch = require('../../../../../platform/components/arch-node/build/Release/arch.node')
const { exit } = require('process')

function printProgress(progress) {
    process.stdout.clearLine()
    process.stdout.cursorTo(0)
    process.stdout.write(progress)
}

const path = '/Users/fmaerten/data/arch/spanish-peak/'
const cavities = 'tube_stock_NEW.ts'
const dikeFilename = 'simulations-dykes.xyz'
const gridFile = '2D_grid_hole_NEW.ts'

const HS = false
const useGravity = true

let alpha
let result

// -----------------------------------------------------------------

const buffer = fs.readFileSync(path + dikeFilename, 'utf8')
const dataframe = io.decodeXYZ(buffer)[0]

const dikes = new geo.JointData({
    dataframe,
    measure: 'n',
    weights: 'w',
    projected: true,
    useNormals: true,
    useAngle: true,
    compute: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
})

let mapping = undefined
if (useGravity) {
    mapping = geo.gradientPressureMapping
} else {
    mapping = alphaMapping = (alpha) => {
        let theta = alpha[0]
        theta = (theta * Math.PI) / 180
        const Kh = alpha[1]
        const KH = alpha[2]
        const shift = alpha[5]
        const cos = Math.cos(theta)
        const sin = Math.sin(theta)
        const cos2 = cos * cos
        const sin2 = sin * sin
        const xx = -(Kh * cos2 + KH * sin2)
        const xy = (Kh - KH) * cos * sin
        const yy = -(Kh * sin2 + KH * cos2)
        const zz = 0

        return [xx, xy, yy, zz, 0, shift]
    }
}

if (1) {
    const start = new Date()

    result = geo.monteCarlo(
        {
            data: [dikes],
            alpha: {
                // [theta, Rh, RH, rockDensity, cavityDensity, shift]
                mapping: mapping,
                min: useGravity
                    ? [82, 0, 0.5, 2900, 2600, 0]
                    : [0, 0, 0.5, 0, 0, 0],
                max: useGravity
                    ? [82, 0.5, 0.5, 2900, 2600, 1e10]
                    : [90, 0.5, 0.5, 0, 0, 1e9],
            },
            onProgress: (i, v) => printProgress(i + ': ' + v + '%'),
            onMessage: (msg) => console.log(msg),
        },
        15000,
    )

    alpha = result.alpha

    dataframe.series['newN'] = df.apply(dikes.generate(alpha), (n) => [
        -n[1],
        n[0],
        0,
    ])
    dataframe.series['n'] = df.apply(dataframe.series.n, (n) => [
        -n[1],
        n[0],
        0,
    ])

    // Removing the weight while computing the cost as attribute
    dikes.setWeights('')
    dataframe.series['cost'] = dikes.costs(alpha)

    result.cost = dikes.cost(alpha)
    result.fit = (1 - result.cost) * 100

    const compute = new Array(6).fill(0).map((v, i) => `S${i + 1}`)
    const stress = math.weightedSum(
        compute.map((name) => dataframe.series[name]),
        alpha,
    )
    dataframe.series['S'] = stress

    console.log('inversion result:', result)

    const end = new Date() - start
    console.info('Execution time for inversion: %dms', end)

    const bufferOut = io.encodeXYZ(dataframe, {
        userData: {
            result: JSON.stringify(result),
        },
    })
    fs.writeFileSync(
        path + 'result-forward-dikes.xyz',
        bufferOut,
        'utf8',
        (err) => {},
    )
} else {
    /*
    theta = 82°
    RH = 0.5
    Rh = 0.38
    P = 6e8 Pa
    */

    // alpha = geo.gradientPressureMapping([30, 0.2, 0.5, 2900, 2600, 6.558e8])
    alpha = geo.gradientPressureMapping([82, 0.48, 0.5, 2900, 2600, 2e8])
    result = alpha
}

// ----------------------------------------------------------------------------

{
    // Bad configuration to check the costs
    // alpha = geo.gradientPressureMapping([
    //     30,
    //     0.41,
    //     0.52,
    //     2900,
    //     2690,
    //     123873722
    // ])

    if (1) {
        dataframe.series['newN'] = df.apply(dikes.generate(alpha), (n) => [
            -n[1],
            n[0],
            0,
        ])
        // dataframe.series['n']    = df.apply(dataframe.series.n,    n => [-n[1], n[0], 0] )

        // dataframe.series['newN'] = dikes.generate(alpha)
        dataframe.series['n'] = dataframe.series.n

        // Removing the weight while computing the cost as attribute
        dikes.setWeights('')
        dataframe.series['cost'] = dikes.costs(alpha)

        result.cost = dikes.cost(alpha)
        result.fit = (1 - result.cost) * 100
        console.log(result)

        const compute = new Array(6).fill(0).map((v, i) => `S${i + 1}`)
        const stress = math.weightedSum(
            compute.map((name) => dataframe.series[name]),
            alpha,
        )
        dataframe.series['S'] = stress

        const bufferOut = io.encodeXYZ(dataframe, {
            userData: {
                result: JSON.stringify(result),
            },
        })
        fs.writeFileSync(
            path + 'result-forward-dikes.xyz',
            bufferOut,
            'utf8',
            (err) => {},
        )
    }

    const model = new arch.Model()
    model.setMaterial(0.25, 30e9, 2900)
    model.setHalfSpace(HS)

    // Discontinuities
    const surfs = io.decodeGocadTS(fs.readFileSync(path + cavities, 'utf8'), {
        repair: false,
    })
    const chambers = []
    surfs.forEach((surf) => {
        const chamber = new arch.Surface(
            surf.series.positions.array,
            surf.series.indices.array,
        )
        chamber.setBC('dip', 'free', 0)
        chamber.setBC('strike', 'free', 0)
        if (useGravity) {
            chamber.setBC(
                'normal',
                'free',
                (x, y, z) => alpha[4] * 9.81 * Math.abs(z) + alpha[5],
            )
            // chamber.setBC("normal", "free", (x,y,z) => alpha[4]*Math.abs(z) + alpha[5] )
        } else {
            chamber.setBC('normal', 'free', () => alpha[5])
        }
        chambers.push(chamber)
        model.addSurface(chamber)
    })

    // Remote
    const remote = new arch.UserRemote()
    if (useGravity) {
        remote.setFunction((x, y, z) => {
            const Z = Math.abs(z)
            return [
                alpha[0] * Z,
                alpha[1] * Z,
                0,
                alpha[2] * Z,
                0,
                alpha[3] * Z,
            ]
        })
    } else {
        remote.setFunction(() => [alpha[0], alpha[1], 0, alpha[2], 0, alpha[3]])
    }
    model.addRemote(remote)

    // Solver
    const solver = new arch.Solver(model)
    solver.select('parallel')
    solver.setNbCores(10)
    solver.setMaxIter(1000)
    solver.setEps(1e-9)
    solver.run()

    // Post-process
    const solution = new arch.Solution(model)
    solution.setNbCores(10)

    const grid = io.decodeGocadTS(fs.readFileSync(path + gridFile, 'utf8'))[0]

    // -----------------------------------------------
    // WARNING !!!!!!!!!!!!!
    // We have to translate the grid of z = -1000
    //grid.series.positions = grid.series.positions.map( p => [p[0], p[1], p[2]-1000])
    // -----------------------------------------------

    const obs = grid.series.positions.array
    grid.series['U'] = df.Serie.create({
        array: solution.displ(obs),
        itemSize: 3,
    })
    grid.series['S'] = df.Serie.create({
        array: solution.stress(obs),
        itemSize: 6,
    })
    grid.series['Joint'] = geo
        .generateJoints({ stress: grid.series['S'], projected: false })
        .map((v) => [v[1], -v[0], v[2]])

    fs.writeFileSync(
        path + 'forward-grid.ts',
        io.encodeGocadTS(grid, {
            expandAttributes: true,
            userData: {
                result: JSON.stringify(result),
            },
        }),
        'utf8',
    )
}
