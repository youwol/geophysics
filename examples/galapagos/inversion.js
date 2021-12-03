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

function printProgress(progress){
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(progress);
}

const path     = '/Users/fmaerten/data/arch/galapagos-all/model2'
const cavities = 'Sill_magma_chambers_500_georef_NEW.ts'

let alpha
let result

// -----------------------------------------------------------------

if (0) {
    const buffer    = fs.readFileSync(path + '/dikes_georef/points.xyz/simulations-All_Galapagos_dikes.xyz', 'utf8')
    const dataframe = io.decodeXYZ(buffer)[0]

    const dikes = new geo.JointData({
        dataframe,
        measure   : 'n',
        projected : true,
        useNormals: true,
        useAngle  : true,
        compute   : new Array(6).fill(0).map( (v,i) => `S${i+1}` )
    })

    result = geo.monteCarlo({
        data: [dikes],
        alpha: {
            // [theta, Rh, RH, rockDensity, cavityDensity, shift]
            mapping: geo.gradientPressureMapping,
            min: [0,   0, 0, Rsed, 2600,   0],
            max: [180, 1, 1, Rsed, 2600, 1e8]
        },
        onProgress: (i,v) => printProgress(i+": "+v+"%"),
        onMessage: msg => console.log(msg)
    }, 15000)

    alpha = result.alpha
    dataframe.series['newN'] = df.apply(dikes.generate(alpha), n => [-n[1], n[0], 0] )
    dataframe.series['n']    = df.apply(dataframe.series.n,    n => [-n[1], n[0], 0] )
    dataframe.series['cost'] = dikes.costs(alpha)

    console.log('inversion result:', result )

    const bufferOut = io.encodeXYZ(dataframe, {
        userData: {
            result: JSON.stringify(result)
        }
    })
    fs.writeFileSync(path + '/result-forward-dikes.xyz', bufferOut, 'utf8', err => {})
}
else {
    alpha  = [-6648.4340942945455,-31.50652278530933,-6674.268689862561,-19620,2600,4484435.5958690625]
    result = alpha
}


// ----------------------------------------------------------------------------

{
    const model = new arch.Model()
    model.setMaterial ( 0.25, 30e9, 2000 )
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

    const gridFiles = [ /*'2D_grid_500_georef.ts', */'vert_2Dgrid_Fernandina_georef.ts']

    let grids = []
    gridFiles.forEach( gridFile => {
        const gs = io.decodeGocadTS( fs.readFileSync(path+'/'+gridFile, 'utf8') )
        grids = [...grids, ...gs]
    })

    grids.forEach( grid => {
        const obs  = grid.series['positions'].array
        grid.series['U']     = df.Serie.create({array: solution.displ(obs) , itemSize: 3})    
        grid.series['S']     = df.Serie.create({array: solution.stress(obs), itemSize: 6})
        grid.series['Joint'] = geo.generateJoints({stress: grid.series['S'], projected: false}).map( v => [v[1], -v[0], 0])
    })

    fs.writeFileSync(path+'/forward-grid.ts', io.encodeGocadTS(grids, {
        expandAttributes: true,
        userData: {
            result: JSON.stringify(result)
        }
    }), 'utf8')
}
