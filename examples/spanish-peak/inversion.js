/**
 * Inverst for the far field stress + 1 pressure in the Fernandina
 * magma chamber
 */
const io     = require('@youwol/io')
const df     = require('@youwol/dataframe')
const math   = require('@youwol/math')
const geo    = require('../../dist/@youwol/geophysics')
const fs     = require('fs')
const arch   = require('../../../../../platform/components/arch-node/build/Release/arch.node')
const { exit } = require('process')

const Rsed   = 2000 // Sediment density (kg/m3)

function printProgress(progress) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(progress);
}

const path     = '/Users/fmaerten/data/arch/spanish-peak'
const cavities = 'volcano_tube.ts'

let alpha
let result

// -----------------------------------------------------------------

const buffer    = fs.readFileSync(path + '/simulations-dykes.xyz', 'utf8')
const dataframe = io.decodeXYZ(buffer)[0]

const dikes = new geo.JointData({
    dataframe,
    measure   : 'n',
    weights   : 'w',
    projected : true,
    useNormals: true,
    useAngle  : true,
    compute   : ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']
})

if (1) {
    result = geo.monteCarlo({
        data: [dikes],
        alpha: {
            // [theta, Rh, RH, rockDensity, cavityDensity, shift]
            mapping: geo.gradientPressureMapping,
            min: [0,   0, 0, 2900, 2000, -1e9],
            max: [180, 1, 1, 2900, 3000,  1e9]
        },
        onProgress: (i,v) => printProgress(i+": "+v+"%"),
        onMessage: msg => console.log(msg)
    }, 10000)

    alpha = result.alpha

    dataframe.series['newN'] = df.apply(dikes.generate(alpha), n => [-n[1], n[0], 0] )
    dataframe.series['n']    = df.apply(dataframe.series.n,    n => [-n[1], n[0], 0] )

    // Removing the weight while computing the cost as attribute
    dikes.setWeights('')
    dataframe.series['cost'] = dikes.costs(alpha)

    result.cost = dikes.cost(alpha)
    result.fit  = (1-result.cost)*100

    const compute = new Array(6).fill(0).map( (v,i) => `S${i+1}` )
    const stress = math.weightedSum( compute.map( name => dataframe.series[name] ), alpha )
    dataframe.series['S'] = stress

    console.log('inversion result:', result )

    const bufferOut = io.encodeXYZ(dataframe, {
        userData: {
            result: JSON.stringify(result)
        }
    })
    fs.writeFileSync(path + '/result-forward-dikes.xyz', bufferOut, 'utf8', err => {})
}
else {
    alpha = [
        -14556.199748377976,
        -45.242992880092224,
        -14298.355343428668,
        -28449,
        2689.8998023084237,
        123873722.62997723
    ]
    user = [
        80.33118460220669,
        0.5023251136680618,
        0.5119303994187476,
        2900,
        2689.8998023084237,
        123873722.62997723
    ]
    extra = {
      cost: 0.08051570851024792,
      fit: 91.94842914897521
    }

    result = alpha
}

// ----------------------------------------------------------------------------

{

    // Bad configuration to check the costs
    //alpha = geo.gradientPressureMapping([0, 0.03, 0.05, 2900, 2240.3654047934, 1e7])

    if (0) {
        dataframe.series['newN'] = df.apply(dikes.generate(alpha), n => [-n[1], n[0], 0] )
        dataframe.series['n']    = df.apply(dataframe.series.n,    n => [-n[1], n[0], 0] )

        // Removing the weight while computing the cost as attribute
        dikes.setWeights('')
        dataframe.series['cost'] = dikes.costs(alpha)

        const compute = new Array(6).fill(0).map( (v,i) => `S${i+1}` )
        const stress = math.weightedSum( compute.map( name => dataframe.series[name] ), alpha )
        dataframe.series['S'] = stress

        const bufferOut = io.encodeXYZ(dataframe, {
            userData: {
                result: JSON.stringify(result)
            }
        })
        fs.writeFileSync(path + '/result-forward-dikes.xyz', bufferOut, 'utf8', err => {})
    }

    const model = new arch.Model()
    model.setMaterial ( 0.25, 30e9, 2900 )
    model.setHalfSpace( true )

    // Discontinuity (sphere)
    const surfs = io.decodeGocadTS( fs.readFileSync(path + '/' + cavities, 'utf8'), {repair: false} )
    const chambers = []
    surfs.forEach( surf => {
        const chamber = new arch.Surface(surf.series.positions.array, surf.series.indices.array)
        chamber.setBC("dip",    "free", 0)
        chamber.setBC("strike", "free", 0)
        chamber.setBC("normal", "free", (x,y,z) => alpha[4]*9.81*Math.abs(z) + alpha[5] )
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

    const gridFile = '2D_grid.ts'
    const grid = io.decodeGocadTS( fs.readFileSync(path+'/'+gridFile, 'utf8') )[0]

    // -----------------------------------------------
    // WARNING !!!!!!!!!!!!!
    // We have to translate the grid of z = -1000
    grid.series.positions = grid.series.positions.map( p => [p[0], p[1], p[2]-1000])
    // -----------------------------------------------

    const obs  = grid.series.positions.array
    grid.series['U']     = df.Serie.create({array: solution.displ(obs) , itemSize: 3})    
    grid.series['S']     = df.Serie.create({array: solution.stress(obs), itemSize: 6})
    grid.series['Joint'] = geo.generateJoints({stress: grid.series['S'], projected: false}).map( v => [v[1], -v[0], v[2]])

    fs.writeFileSync(path+'/forward-grid.ts', io.encodeGocadTS(grid, {
        expandAttributes: true,
        userData: {
            result: JSON.stringify(result)
        }
    }), 'utf8')
}
