/**
 * Generic inversion using a JSON file for configuration
 */

const io = require('@youwol/io')
const df = require('@youwol/dataframe')
const math = require('@youwol/math')
const geo = require('../../dist/@youwol/geophysics')
const fs = require('fs')
const arch = require('../../../../../platform/components/arch-node/build/Release/arch.node')
const parser = require('./parser.js.OLD')
const { exit } = require('process')

function getData(name, parameters, dataframe, args) {
    parameters['dataframe'] = dataframe
    parameters['compute'] = new Array(args.inverse.dim)
        .fill(0)
        .map((v, i) => `${parameters.compute}${i + 1}`)

    if (name === 'joint' || name === 'dyke' || name === 'dike')
        return new geo.JointData(parameters)
    if (name === 'stylolite') return new geo.StyloliteData(parameters)

    return undefined
}

function printProgress(progress) {
    process.stdout.clearLine()
    process.stdout.cursorTo(0)
    process.stdout.write(progress)
}

function printHelp() {
    console.log(`
    -------------------------------------
    Script usage to perform superposition
    -------------------------------------
    
    Usages:
        node inversion.js model.json
        node inversion.js
    `)
}

if (process.argv.length < 3) {
    printHelp()
    exit(1)
}

const params = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
let result = undefined
let alpha = undefined

if (params.inverse && params.inverse.active) {
    const buffer = fs.readFileSync(
        params.model.path +
            params.inverse.data.path +
            params.inverse.data.filename,
        'utf8',
    )
    const dataframe = io.decodeXYZ(buffer)[0]

    console.log(params.inverse.data.parameters)
    const data = getData(
        params.inverse.data.type,
        params.inverse.data.parameters,
        dataframe,
        params,
    )
    if (data === undefined) {
        console.error(
            'cannot create data from',
            params.model.path +
                params.inverse.data.path +
                params.inverse.data.filename,
        )
    }
    console.log(data)

    const alphaDim = params.inverse.data.parameters.compute.length

    result = geo.monteCarlo(
        {
            data: [data],
            alpha: {
                mapping: eval(`geo.${params.inverse.simulation.alpha.mapping}`),
                min: params.inverse.simulation.alpha.min,
                max: params.inverse.simulation.alpha.max,
            },
            onProgress: (i, v) => printProgress(i + ': ' + v + '%'),
            onMessage: (msg) => console.log(msg),
        },
        params.inverse.simulation.iterations,
    )

    console.log('solution:\n', result)
    alpha = result.alpha

    dataframe.series['cost'] = data.costs(alpha)
    dataframe.series['newN'] = df.apply(data.generate(alpha), (n) => [
        -n[1],
        n[0],
        0,
    ])
    //dataframe.series['n']    = df.apply(dataframe.series.n,   n => [-n[1], n[0], 0] )

    const stress = math.weightedSum(data.compute, alpha)
    dataframe.series['S'] = stress

    const bufferOut = io.encodeXYZ(dataframe, {
        userData: {
            result: JSON.stringify(result),
        },
    })
    console.log(
        'writting file:',
        params.model.path +
            params.inverse.out.path +
            params.inverse.out.filename,
    )
    fs.writeFileSync(
        params.model.path +
            params.inverse.out.path +
            params.inverse.out.filename,
        bufferOut,
        'utf8',
        (err) => {},
    )
} else {
    console.warn('Skipping the inversion modeling')
}

// ----------------------------------------------------------------------------

if (params.forward !== undefined && params.forward.active) {
    if (params.forward.alpha) {
        console.warn('WARNING: replacing alpha with the provided one')
        alpha = params.forward.alpha
    }
    const model = new arch.Model()
    model.setMaterial(
        params.model.poisson,
        params.model.young,
        params.model.rockDensity,
    )
    model.setHalfSpace(params.model.halfSpace)

    // Discontinuity (sphere)
    const surfs = io.decodeGocadTS(
        fs.readFileSync(
            params.model.path +
                params.forward.cavity.path +
                params.forward.cavity.filename,
            'utf8',
        ),
        { repair: false },
    )
    const chambers = []

    let perCavity = false
    if (alpha.length === 5 + surfs.length) {
        perCavity = true
    } else {
        if (alpha.length !== 6) {
            console.error(
                'Someting is wrong: alpha size is strange. Getting',
                alpha.length,
            )
            exit(-1)
        }
    }

    surfs.forEach((surf, i) => {
        const chamber = new arch.Surface(
            surf.series.positions.array,
            surf.series.indices.array,
        )
        chamber.setBC('dip', 'free', 0)
        chamber.setBC('strike', 'free', 0)
        if (perCavity) {
            chamber.setBC(
                'normal',
                'free',
                (x, y, z) => alpha[4] * 9.81 * Math.abs(z) + alpha[5 + i],
            )
        } else {
            chamber.setBC(
                'normal',
                'free',
                (x, y, z) => alpha[4] * 9.81 * Math.abs(z) + alpha[5],
            )
        }
        chambers.push(chamber)
        model.addSurface(chamber)
    })

    // Remote
    const remote = new arch.UserRemote()
    remote.setFunction((x, y, z) => {
        const Z = Math.abs(z)
        return [alpha[0] * Z, alpha[1] * Z, 0, alpha[2] * Z, 0, alpha[3] * Z]
    })
    model.addRemote(remote)

    // Solver
    const solver = new arch.Forward(model)
    solver.select(params.forward.solver.name)
    solver.setNbCores(params.forward.solver.core)
    solver.setMaxIter(params.forward.solver.maxIter)
    solver.setEps(params.forward.solver.eps)
    solver.run()

    // Post-process
    const solution = new arch.Solution(model)
    solution.setNbCores(params.forward.solver.core)

    const grid = io.decodeGocadTS(
        fs.readFileSync(
            params.model.path +
                params.forward.grid.path +
                params.forward.grid.filename,
            'utf8',
        ),
    )[0]
    if (params.forward.grid.translate) {
        const t = params.forward.grid.translate
        console.log('translating the grid to', t)
        grid.series['positions'] = grid.series['positions'].map((p) => [
            p[0] + t[0],
            p[1] + t[1],
            p[2] + t[2],
        ])
    }

    const obs = grid.series['positions'].array
    grid.series['U'] = df.Serie.create({
        array: solution.displ(obs),
        itemSize: 3,
    })
    grid.series['S'] = df.Serie.create({
        array: solution.stress(obs),
        itemSize: 6,
    })

    // Generate joint normals => take the ortho
    grid.series['Joint'] = geo
        .generateJoints({ stress: grid.series['S'], projected: true })
        .map((v) => [v[1], -v[0], 0])

    fs.writeFileSync(
        params.model.path +
            params.forward.grid.out.path +
            params.forward.grid.out.filename,
        io.encodeGocadTS(grid, {
            expandAttributes: params.forward.grid.out.expandAttributes,
            userData: {
                result: params.forward.alpha
                    ? params.forward.alpha
                    : JSON.stringify(result),
            },
        }),
        'utf8',
    )
} else {
    console.warn('Skipping the forward modeling')
}
