const df = require('../../../dataframe/dist/@youwol/dataframe')
const math = require('../../../math/dist/@youwol/math')
const geom = require('../../../geometry/dist/@youwol/geometry')
const io = require('../../../io/dist/@youwol/io')
const geop = require('../../dist/@youwol/geophysics')
const fs = require('fs')

const { exit } = require('process')

function generateData(args, data, dataframe) {
    if (data['attribute'] === undefined) {
        data['attribute'] = data.compute // save
        data['dataframe'] = dataframe // mandatory

        // e.g., [S1, ..., Sn]
        data['compute'] = new Array(args.dim).fill(0).map((_v, i) => {
            const name = `${data.attribute}${i + 1}`
            if (dataframe.contains(name) === false) {
                throw new Error(
                    `Serie '${name}' does not exist in data ${data.file}`,
                )
            }
            return name
        })
    }

    // Before: ERROR here (not the same!)
    // console.log(dataframe.series.dipAngle.array[0], data.dataframe.series.dipAngle.array[0])

    // console.log(data)

    switch (data.type) {
        case 'joint':
        case 'dike':
        case 'dyke':
            return new geop.JointData(data)
        case 'stylolite':
            return new geop.StyloliteData(data)
        case 'conjugate':
            return new geop.ConjugateData(data)
        case 'scalar':
            return new geop.GenericScalarFieldData(data)
        case 'gps':
            return new geop.GpsData(data)
        case 'vgps':
            return new geop.VerticalGpsData(data)
        default: {
            throw new Error(
                `Unknown data type "${data.type}". Should be "joint", "dyke", "dike", "stylolite", "conjugate", "scalar, "gps" or "vgps" (for the moment)`,
            )
        }
    }
}

function displaySolution(_args, solution, mapping) {
    let A = {}
    A.Cost = { value: parseFloat(solution.cost.toFixed(3)) }
    A.Fit = { value: solution.fit.toFixed(0) + '%' }
    A.Mean_mistfit = { value: solution.meanMistfit.toFixed(1) + '°' }
    A.Iteration = { value: solution.iteration + '/' + solution.maxIteration }

    solution.user.forEach((v, i) => (A[`User-${i + 1}`] = v))
    // A.User = { value: solution.user.map(v => v.toFixed(2)) }
    // A.User = {value: solution.user.map( v => v.toFixed(2)) }
    console.table(A)

    console.log('')
    console.log('cost        ', solution.cost.toFixed(3))
    console.log('fit         ', solution.fit.toFixed(0) + '%')
    console.log('mean mistfit', solution.meanMistfit.toFixed(1) + '°')
    console.log(
        'iteration   ',
        solution.iteration + '/' + solution.maxIteration,
    )
    console.log('theta       ', solution.user[0].toFixed(2))
    console.log('Rb          ', solution.user[1].toFixed(2))
}

function getSolution(cost, alpha, userParams, iteration, maxIteration) {
    return {
        alpha,
        cost,
        iteration,
        maxIteration,
        user: userParams,
        meanMistfit: cost * 90,
        fit: Math.round((1 - cost) * 10000) / 100,
    }
}

function monteCarlo(params, n) {
    const genRandom = (min, max) => min + math.randomMT(max - min)

    if (params.alpha === undefined) throw new Error('alpha is undefined')
    if (params.data === undefined) throw new Error('data is undefined')

    const limits = []
    params.alpha.min.forEach((m, i) => {
        limits.push({
            min: m,
            max: params.alpha.max[i],
        })
    })

    // Check the generated alpha
    // --> Will trigger an exception if something went wrong
    params.alpha.mapping(limits.map((l) => genRandom(l.min, l.max)))

    // Set the data weight if necessary
    // params.data.forEach( d => d.weight===undefined ? d.weight=1 : 1)

    let solution = {
        alpha: [],
        user: [],
        cost: 1e32,
        meanMistfit: 0,
        fit: 0,
        iteration: 0,
        maxIteration: n,
    }

    const mod = (n / 100) * 5 // 5%

    // ===================================================================
    // FOR DEBUGGING
    // const userParams = [10.788649404421449,2.9690496576949954,2000]
    // const alpha = params.alpha.mapping(userParams)
    // const c = geop.cost(params.data, alpha) // c in NaN
    // ===================================================================

    for (let i = 0; i < n; ++i) {
        // Generate the alpha
        const userParams = limits.map((l) => genRandom(l.min, l.max))
        const alpha = params.alpha.mapping(userParams)

        const c = geop.cost(params.data, alpha)

        if (c < solution.cost) {
            solution = getSolution(c, alpha, userParams, i, n)
            if (params.onMessage) {
                displaySolution(args, solution, params.alpha.mapping)
            }
        }
        if (i % mod == 0 && params.onProgress) {
            params.onProgress(i, (i * 100) / n)
        }
    }

    return solution
}

function postprocess(_args, grids, alpha) {
    if (grids.in === undefined) {
        return
    }

    if (grids.in.length === 0) {
        return
    }

    if (grids.out === undefined) {
        throw new Error('tag "out" is undefined for grids', grids)
    }

    grids.in.forEach((inFilename, index) => {
        inFilename = globalPath + inFilename // <----------------------

        const outFilename = globalPath + grids.out[index] // <----------------------

        const filter = io.IOFactory.getFilter(inFilename)
        if (filter === undefined) {
            console.warn('Cannot find decoder for grid:', inFilename)
        } else {
            const dfs = []
            const buffer = fs.readFileSync(inFilename, 'utf8')
            const dataframes = filter.decode(buffer, {
                shared: false,
                merge: true,
            })

            dataframes.forEach((grid) => {
                const dataframe = grid // just a renaming

                // attrs of type [{itemSize: number, name: string, start: number, end: number}]
                const attrs = geop.attributeDetector(dataframe)

                attrs.forEach((attr) => {
                    dataframe.series[attr.name] = geop.forward.attribute({
                        simulations: dataframe,
                        alpha,
                        name: attr.name,
                    })
                })

                if (grids.removeSuperposition === true) {
                    attrs.forEach((c) => {
                        for (let i = c.start; i <= c.end; ++i) {
                            dataframe.remove(`${c.name}${i}`)
                        }
                    })
                }

                dfs.push(dataframe)
            })

            console.log('saving grid', outFilename)

            fs.writeFileSync(
                outFilename,
                filter.encode(dfs, {
                    expandAttributes: true,
                }),
                'utf8',
                (err) => {},
            )
        }
    })
}

function postprocessOnData(datas, solution) {
    // ===========================================
    // Compute the synthetic attr on data
    // ===========================================
    const d = []
    let dd = []
    let dataId = -1

    datas.forEach((data) => {
        if (data.data.out === undefined) {
            return
        }

        const prefix =
            data.data.out.prefix !== undefined
                ? data.data.out.prefix
                : 'forward'

        // geop.forward.attribute({
        //     simulations: data.dataframe,
        //     alpha: solution.alpha,
        //     name: data.data.attribute,
        //     startIndex: 1
        // })

        data.generateInDataframe({
            alpha: solution.alpha,
            prefix,
            options: data.data.out.options,
        })
        // data.dataframe.series['cost'] = data.costs(solution.alpha)

        // Gather data with same dataId
        if (dataId === -1) {
            dataId = data.dataId
            dd.push(data)
        } else {
            if (data.dataId === dataId) {
                dd.push(data)
            } else {
                d.push([...dd])
                dd = [data]
                dataId = data.dataId
            }
        }
    })

    // The last one...
    d.push(dd)

    // Now save the data
    d.forEach((dd) => {
        // dd is an array of Data
        if (dd.length === 0) {
            return
        }

        if (dd[0].data.out.file) {
            const filename = globalPath + dd[0].data.out.file

            // Gather the dataframes in dd
            const dfs = dd.map((ddd) => ddd.dataframe)
            const filter = io.IOFactory.getFilter(filename)
            if (filter === undefined) {
                console.warn('Cannot find decoder for grid:', filename)
            } else {
                console.log('saving data', filename)
                fs.writeFileSync(
                    filename,
                    filter.encode(dfs, {
                        expandAttributes: true,
                    }),
                    'utf8',
                    (err) => {},
                )
            }
        }
    })
}

function postprocessOnGrids(args, solution) {
    if (args.postprocess !== undefined) {
        const p = args.postprocess
        if (p.grids.active !== undefined && p.grids.active === true) {
            postprocess(args, p.grids, solution.alpha)
        }
        if (p.cavities.active !== undefined && p.cavities.active === true) {
            postprocess(args, p.cavities, solution.alpha)
        }
        if (p.faults.active !== undefined && p.faults.active === true) {
            postprocess(args, p.faults, solution.alpha)
        }
    }
}

function doDomain(args, params, solution) {
    if (
        args.postprocess.domain !== undefined &&
        args.postprocess.domain.active === true
    ) {
        const nx = args.postprocess.domain.nx
        const ny = args.postprocess.domain.ny
        const xAxisIndex = args.postprocess.domain.xAxis
        const yAxisIndex = args.postprocess.domain.yAxis

        console.log('domain:', nx, ny, xAxisIndex, yAxisIndex)

        const d = new geop.Domain2D({ model: params, nX: nx, nY: ny })
        const domain = d.evaluate(
            xAxisIndex,
            yAxisIndex,
            args.postprocess.domain.user !== undefined
                ? args.postprocess.domain.user
                : solution.user,
        )

        const array = []
        let k = 0
        const flatten =
            args.postprocess.domain.flatten !== undefined
                ? args.postprocess.domain.flatten
                : false
        const F = flatten ? 1 / 10000 : 1
        for (let i = 0; i < nx; ++i) {
            const x = i / (nx - 1)
            for (let j = 0; j < ny; ++j) {
                const y = j / (ny - 1)
                array.push(x, y, domain.itemAt(k++) * F) // <----------- FLATTEN !!!!!!!!!!!!!!!!!!!!!!!!
            }
        }

        const T = geom.triangulate(df.Serie.create({ array, itemSize: 3 }))

        const filename = globalPath + args.postprocess.domain.out

        const filter = io.IOFactory.getFilter(filename)
        console.log('saving domain', filename)
        fs.writeFile(
            filename,
            filter.encode(T, {
                userData: {
                    userAlpha:
                        args.postprocess.domain.user !== undefined
                            ? args.postprocess.domain.user
                            : solution.user,
                    nx: args.postprocess.domain.nx,
                    ny: args.postprocess.domain.ny,
                    xAxis: args.postprocess.domain.xAxis,
                    yAxis: args.postprocess.domain.yAxis,
                },
            }),
            'utf8',
            (_err) => {},
        )
    }
}

// ===========================================================================================

if (process.argv.length !== 3) {
    console.warn('Expected argument:')
    console.warn('  node superposition.js jsonFile')
    exit(1)
}

const args = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))

const min = args.min
const max = args.max

// Add the shift for min and max arrays?
if (args.minShift && args.minShift) {
    // <------------------ TODO: check the dim if no pressure ?
    for (let i = 0; i < args.dim - 5; ++i) {
        min.push(args.minShift)
        max.push(args.maxShift)
    }
}

// Check the global path if any
// ----------------------------
let globalPath = args.path
if (globalPath.endsWith('/') === false) {
    globalPath += '/'
}

// ===========================================
// PREPARE THE DATA

/*
A data object is of the form:
-----------------------------
GenericScalarFieldData {
    weights_: undefined,
    weight: 1,
    sumWeights: 1,
    computeNames: [ 'S1', 'S2', 'S3', 'S4', 'S5', 'S6' ],
    dataframe: a {
        ...
    },
    measure: c {
        dimension: 3,
        userData: {},
        array: Float32Array(32) [...],
        itemSize: 1,
        shared: false
    },
    compute: [
        c {
            dimension: 3,
            userData: {},
            array: [Float32Array],
            itemSize: 6,
            shared: false
        },
        c {...},
        c {...},
        c {...},
        c {...},
        c {...}
    ],
    positions: undefined,
    coordIndex: 0,
    xScale: 1,
    yScale: 1,
    useDerivative: false,
    dataId: 0,
    data: {
        file: 'simulations/grids/data_for_inversion_01.xyz',
        out: {
            file: 'inversion/data_for_inversion_01.xyz',
            prefix: 'C',
            options: [Object]
        },
        measure: 'Szz',
        compute: [ 'S1', 'S2', 'S3', 'S4', 'S5', 'S6' ],
        type: 'scalar',
        projected: true,
        useNormals: true,
        active: true,
        weight: 1,
        dataId: 0,
        attribute: 'S',
        dataframe: a {...}
    }
}
*/
// ===========================================
const datas = []
args.datas.forEach((DATA, dataId) => {
    if (
        DATA.active === undefined ||
        (DATA.active !== undefined && DATA.active === true)
    ) {
        const file = globalPath + DATA.file

        const filter = io.IOFactory.getFilter(file)
        if (filter === undefined) {
            console.warn('Cannot find decoder for file:', file)
            return
        } else {
            DATA.dataId = dataId
            const buffer = fs.readFileSync(file, 'utf8')
            const dataframes = filter.decode(buffer, {
                shared: false,
                merge: true,
            }) // !!! BEFORE: Take only the first loaded dataframe
            dataframes.forEach((dataframe) => {
                const data = Object.assign({}, DATA)
                const d = generateData(args, data, dataframe)
                d.dataId = dataId
                d.data = data
                datas.push(d)
                // console.log(d)
            })
        }
        console.warn('adding data', file)
    } else {
        console.warn('skipping data', file)
    }
})

const mapping = geop.MappingFactory.resolve(args.mapping)
if (mapping === undefined) {
    throw new Error(
        `Unknown mapping function ${args.mapping}. Possible values are ${geop.MappingFactory.names().map((n) => ' ' + n)}`,
    )
}

/*
// For the moment, à la mano (no Object-Factory)
let mapping = undefined
switch (args.mapping) {
    case "simpleAndersonMapping": mapping = geop.simpleAndersonMapping; break
    case "gradientPressureMapping": mapping = geop.gradientPressureMapping; break
    case "gradientAndersonMapping": mapping = geop.gradientAndersonMapping; break
    case "defaultMapping": mapping = geop.defaultMapping; break
    default: throw new Error('Unknown mapping function ' + args.mapping)
}
*/

const params = {
    alpha: { mapping, min, max },
    data: datas,
    onProgress: (m) => console.log(m),
    onMessage: (m) => console.log(m),
}

// ===========================================
// INVERSION
// ===========================================
console.log('Performing Monte-Carlo', args.nbSimulations + '...')

let solution = monteCarlo(params, args.nbSimulations)

console.log('')
console.log('')
console.log('Best solution          ')
displaySolution(args, solution)

// ===========================================
// POST-PROCESSES on DATA themself
// ===========================================
postprocessOnData(datas, solution)

// ===========================================
// OTHER POST-PROCESSES
// ===========================================
postprocessOnGrids(args, solution)

// ===========================================
// DOMAIN
// ===========================================
doDomain(
    args,
    params,
    solution,
    args.postprocess.domain.xAxis,
    args.postprocess.domain.yAxis,
)
