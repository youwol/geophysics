const arch = require('../../../../../platform/components/arch-node/build/Release/arch.node')
const io = require('../../../io/dist/@youwol/io')
const df = require('../../../dataframe/dist/@youwol/dataframe')
const math = require('../../../math/dist/@youwol/math')
const geom = require('../../../geometry/dist/@youwol/geometry')
const geo = require('../../dist/@youwol/geophysics')
const fs = require('fs')
const { exit } = require('process')

const MSG = (...args) => console.log('ARCH: ', ...args)

// let simulation_dikes_filename = undefined

function initialization(index, zCavity, zGrid) {
    function save() {
        const userData = {
            index: index,
            zCavity: zCavity,
            zGrid: zGrid,
        }

        const simulation_dikes_filename =
            path + params.grid.out.path + `simulations-dykes-${index}.xyz`

        const bufferOut = io.encodeXYZ(grids, {
            expandAttributes: true,
            userData,
        })
        fs.writeFileSync(simulation_dikes_filename, bufferOut, 'utf8')
    }

    // =========================================================

    const params = JSON.parse(
        fs.readFileSync('Fernandina.json', 'utf8'),
    ).initialization

    const path = params.model.path
    const cavityNames = []
    const cavities = []
    const chambers = []
    let grids = []

    const pathC = params.cavity.path
    params.cavity.filename.forEach((cavityName) => {
        const s = io.decodeGocadTS(
            fs.readFileSync(path + pathC + cavityName, 'utf8'),
            { repair: true },
        )
        if (s === undefined || s.length === 0) {
            console.error(
                `cavities ${path + pathC + cavityName} cannot be loaded`,
            )
            exit(-1)
        }
        s.forEach((S) => {
            cavities.push(S)
            cavityNames.push(cavityName)
        })
    })

    const model = new arch.Model()
    model.setMaterial(
        params.model.poisson,
        params.model.young,
        params.model.rockDensity,
    )
    model.setHalfSpace(params.model.halfSpace)

    MSG('model poisson:', params.model.poisson)
    MSG('model young:', params.model.young)
    MSG('model is half-space:', params.model.halfSpace)

    cavities.forEach((surf, i) => {
        // translate
        const t = params.cavity.translate
        surf.series.positions = df.apply(surf.series.positions, (p) => [
            p[0] + t[0],
            p[1] + t[1],
            p[2] + t[2] + zCavity,
        ])
        const chamber = new arch.Surface(
            surf.series.positions.array,
            surf.series.indices.array,
        )
        chamber.setBC('dip', 'free', 0)
        chamber.setBC('strike', 'free', 0)
        chamber.setBC('normal', 'free', 0)
        model.addSurface(chamber)
        chambers.push(chamber)
    })

    if (params.model.check) {
        let ok = model.check((msg) => console.log('ERROR: at ' + msg))
        if (ok === false) {
            console.log('ERROR: Some triangles have null area. Exiting.')
            exit(-1)
        }

        if (params.model.halfSpace) {
            cavities.forEach((surf, i) => {
                const mm = math.minMax(surf.series.positions)
                if (mm[5] > 0) {
                    console.log(
                        'ERROR: Model in half-space and disconinuity at index ' +
                            i +
                            ' have some z > 0.',
                    )
                    exit(-1)
                }
            })
        }
    }

    console.log('Model nb dofs:', model.nbDof())

    const remote = new arch.UserRemote()
    model.addRemote(remote)

    const solver = new arch.Forward(model)
    solver.select(params.solver.name)
    solver.setNbCores(params.solver.core)
    solver.setMaxIter(params.solver.maxIter)
    solver.setEps(params.solver.eps)
    // solver.onMessage ( msg => MSG(msg) )
    // solver.onError   ( msg => MSG(msg) )
    // solver.onWarning ( msg => MSG(msg) )
    // solver.onProgress( msg => MSG(msg) )

    const pathG = params.grid.path
    params.grid.filename.forEach((gridName) => {
        console.log('loading data file', path + pathG + gridName)
        if (gridName.endsWith('xyz')) {
            const allgrids = io.decodeXYZ(
                fs.readFileSync(path + pathG + gridName, 'utf8'),
            )
            grids = [...grids, ...allgrids]
        } else if (gridName.endsWith('ts') || gridName.endsWith('gcd')) {
            const allgrids = io.decodeGocadTS(
                fs.readFileSync(path + pathG + gridName, 'utf8'),
            )
            grids = [...grids, ...allgrids]
        } else {
            console.error(
                'Unknown file format for grid: ' + path + pathG + gridName,
            )
            exit(-1)
        }
    })

    if (grids.length === 0) {
        console.error('No grids loaded')
        exit(-1)
    }
    grids.forEach((grid, i) => {
        console.log(
            'grid ' + (i + 1) + ' nb-points:',
            grid.series['positions'].count,
        )
        //console.log(grid.series['w'])
    })

    // translate grids ?
    {
        const t = params.grid.translate
        grids.forEach(
            (grid) =>
                (grid.series.positions = df.apply(
                    grid.series.positions,
                    (p) => [p[0] + t[0], p[1] + t[1], p[2] + t[2] + zGrid],
                )),
        )
    }

    if (params.model.check && params.model.halfSpace) {
        grids.forEach((grid, i) => {
            const mm = math.minMax(grid.series.positions)
            if (mm[5] > 0) {
                console.log(
                    'ERROR: Model in half-space and grid at index ' +
                        i +
                        ' have some z > 0.',
                )
                exit(-1)
            }
        })
    }

    let nbSimulations = 6
    if (params.model.perCavity === true) {
        nbSimulations = 5 + chambers.length
    }

    console.log('Performing', nbSimulations, 'simulations')

    // -----------------------------------
    // Use lithostatic loading or not
    // -----------------------------------
    let useGravity = true // by default
    if (params.model.gravity !== undefined) {
        useGravity = params.model.gravity
    }
    MSG('use gravity:', useGravity)

    const doSimulation = (index) => {
        const alpha = new Array(nbSimulations)
            .fill(0)
            .map((v, i) => (i === index - 1 ? 1 : 0))
        console.log('=======> Doing simulation', alpha)

        // Setup the new remote
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
            remote.setFunction(() => {
                return [alpha[0], alpha[1], 0, alpha[2], 0, alpha[3]]
            })
        }

        /*
                ======================================================================
                WARNING: have to remove the multiplication by 9.81 at line 248 and 258
                since it will be multiplied during the inversion in the mapping
                function
                ======================================================================
        */

        // Setup the new pressure in cavities
        if (params.model.perCavity === true) {
            chambers.forEach((chamber, i) => {
                if (useGravity) {
                    chamber.setBC(
                        'normal',
                        'free',
                        (x, y, z) =>
                            alpha[4] * Math.abs(z) * 9.81 + alpha[5 + i],
                    )
                    // chamber.setBC( "normal", "free", (x,y,z) => alpha[4]*Math.abs(z) + alpha[5+i] )
                } else {
                    chamber.setBC('normal', 'free', () => alpha[5 + i])
                }
            })
        } else {
            chambers.forEach((chamber) => {
                if (useGravity) {
                    chamber.setBC(
                        'normal',
                        'free',
                        (x, y, z) => alpha[4] * Math.abs(z) * 9.81 + alpha[5],
                    )
                    // chamber.setBC( "normal", "free", (x,y,z) => alpha[4]*Math.abs(z) + alpha[5] )
                } else {
                    chamber.setBC('normal', 'free', () => alpha[5])
                }
            })
        }

        solver.run()
        const solution = new arch.Solution(model)

        if (params.cavity.out.burgers.active) {
            const burgers = solution.burgers(true, false)
            cavities.forEach((surf, i) => {
                surf.series[`${params.cavity.out.burgers.name}${index}`] =
                    df.Serie.create({ array: burgers[i], itemSize: 3 })
            })
            if (params.cavity.info) {
                burgers.forEach((burger, i) => {
                    console.log(
                        '  - Burger min-max for surface ' +
                            i +
                            ': ' +
                            math.minMaxArray(burger),
                    )
                })
            }
        }

        solution.setNbCores(params.solver.core)
        solution.onMessage((msg) => console.log(msg))
        solution.onProgress((i, p) =>
            console.log(`nb-pts so far: ${i}, realized: ${p.toFixed(0)}%`),
        )

        grids.forEach((grid, i) => {
            const obs = grid.series['positions'].array

            if (params.grid.out.displ.active) {
                const displ = df.Serie.create({
                    array: solution.displ(obs),
                    itemSize: 3,
                })
                grid.series[`${params.grid.out.displ.name}${index}`] = displ
                if (params.grid.info) {
                    console.log(
                        '  - Displ min-max for grid ' +
                            i +
                            ': ' +
                            math.minMaxArray(displ.array),
                    )
                }
            }
            if (params.grid.out.strain.active) {
                const strain = df.Serie.create({
                    array: solution.strain(obs),
                    itemSize: 6,
                })
                grid.series[`${params.grid.out.strain.name}${index}`] = strain
                if (params.grid.info) {
                    console.log(
                        '  - Strain min-max for grid ' +
                            i +
                            ': ' +
                            math.minMaxArray(strain.array),
                    )
                }
            }
            if (params.grid.out.stress.active) {
                const stress = df.Serie.create({
                    array: solution.stress(obs),
                    itemSize: 6,
                })
                grid.series[`${params.grid.out.stress.name}${index}`] = stress
                if (params.grid.info) {
                    console.log(
                        '  - Stress min-max for grid ' +
                            i +
                            ': ' +
                            math.minMaxArray(stress.array),
                    )
                }
            }
        })
    }

    const start = new Date()

    for (let i = 1; i <= nbSimulations; ++i) {
        doSimulation(i)
    }

    const end = new Date() - start
    console.info(
        'Execution time for superposition of ' + nbSimulations + ': %dms',
        end,
    )

    save()
}

function invert(index, zCavity, zGrid) {
    function getData(name, parameters, dataframe, args) {
        parameters['dataframe'] = dataframe
        parameters['compute'] = new Array(args.inverse.dim)
            .fill(0)
            .map((v, i) => `${parameters.compute}${i + 1}`)

        if (name === 'joint' || name === 'dyke' || name === 'dike') {
            return new geo.JointData(parameters)
        }

        if (name === 'stylolite') {
            return new geo.StyloliteData(parameters)
        }

        return undefined
    }

    function printProgress(progress) {
        process.stdout.clearLine()
        process.stdout.cursorTo(0)
        process.stdout.write(progress)
    }

    const paramsModel = JSON.parse(
        fs.readFileSync('Fernandina.json', 'utf8'),
    ).initialization
    const params = JSON.parse(
        fs.readFileSync('Fernandina.json', 'utf8'),
    ).inversion
    const simulation_dikes_filename =
        paramsModel.model.path +
        paramsModel.grid.out.path +
        `simulations-dykes-${index}.xyz`

    let result = undefined
    let alpha = undefined

    if (params.inverse && params.inverse.active) {
        const buffer = fs.readFileSync(simulation_dikes_filename, 'utf8')
        const dataframe = io.decodeXYZ(buffer)[0]

        // HAVE TO TRANSLATE ??

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

        const alphaDim = params.inverse.data.parameters.compute.length

        result = geo.monteCarlo(
            {
                data: [data],
                alpha: {
                    mapping: eval(
                        `geo.${params.inverse.simulation.alpha.mapping}`,
                    ),
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

        dataframe.series['newN'] = df.apply(data.generate(alpha), (n) => [
            -n[1],
            n[0],
            0,
        ])
        //dataframe.series['n']    = df.apply(dataframe.series.n,   n => [-n[1], n[0], 0] )

        const stress = math.weightedSum(data.compute, alpha)
        dataframe.series['S'] = stress

        dataframe.series['cost'] = data.costs(alpha)
        dataframe.series['misfit'] = data
            .costs(alpha)
            .map((v) => (v * 180) / Math.PI)

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
                `result-forward-dikes-${index}.xyz`,
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

        // Discontinuity
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
            // translate
            const t = params.forward.cavity.translate
            surf.series.positions = df.apply(surf.series.positions, (p) => [
                p[0] + t[0],
                p[1] + t[1],
                p[2] + t[2] + zCavity,
            ])

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
            return [
                alpha[0] * Z,
                alpha[1] * Z,
                0,
                alpha[2] * Z,
                0,
                alpha[3] * Z,
            ]
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

        const minMax = [648750, 9944038, 0, 680787.4375, 9971333, 0]
        const grid = geom.generateRectangle({
            a: minMax[3] - minMax[0],
            b: minMax[4] - minMax[1],
            na: 50,
            nb: 50,
            center: [
                (minMax[3] + minMax[0]) / 2,
                (minMax[4] + minMax[1]) / 2,
                0,
            ],
        })
        //const grid = io.decodeGocadTS( fs.readFileSync(params.model.path + params.forward.grid.path + params.forward.grid.filename, 'utf8') )[0]

        // Translate
        const t = params.forward.grid.translate
        grid.series.positions = df.apply(grid.series.positions, (p) => [
            p[0] + t[0],
            p[1] + t[1],
            p[2] + t[2] + zGrid,
        ])
        const obs = grid.series['positions'].array
        // grid.series['U'] = df.Serie.create({array: solution.displ(obs) , itemSize: 3})
        const S = df.Serie.create({ array: solution.stress(obs), itemSize: 6 })

        // Generate joint normals => take the ortho
        grid.series['Joint'] = geo
            .generateJoints({ stress: S, projected: true })
            .map((v) => [v[1], -v[0], 0])
        grid.series['S'] = S

        // -----------------------------------------------
        fs.writeFileSync(
            params.model.path +
                params.forward.grid.out.path +
                `result-grid-${index}.ts`,
            io.encodeGocadTS(grid, {
                expandAttributes: false,
                userData: {
                    result: params.forward.alpha
                        ? params.forward.alpha
                        : JSON.stringify(result),
                },
            }),
            'utf8',
        )
        // -----------------------------------------------
        grid.remove('indices')
        fs.writeFileSync(
            params.model.path +
                params.forward.grid.out.path +
                `result-grid-${index}.xyz`,
            io.encodeXYZ(grid, {
                expandAttributes: true,
                userData: {
                    result: params.forward.alpha
                        ? params.forward.alpha
                        : JSON.stringify(result),
                },
            }),
            'utf8',
        )
        // -----------------------------------------------
    } else {
        console.warn('Skipping the forward modeling')
    }

    return result
}

// =================================================
var logger = fs.createWriteStream('log.txt', {
    flags: 'a', // 'a' means appending (old data will be preserved)
})
logger.write(`index cost fit alpha\n`)

if (1) {
    for (let index = 0; index < 14; ++index) {
        console.log('===========================================')
        console.log('                 index', index)
        console.log('===========================================')
        initialization(index, 0, -index * 100)
        const result = invert(index, 0, -index * 100)
        const alpha = result.alpha
        const cost = result.cost
        const fit = result.fit
        logger.write(`${index} ${cost} ${fit} ${alpha[5]}\n`)
        ++index
    }
} else {
    const index = 5
    invert(index, 0, -index * 100)
}
