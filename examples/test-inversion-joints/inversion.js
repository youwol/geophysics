/**
 * Invert for the far field stress + 1 pressure ina cavity
 */
const io     = require('@youwol/io')
const df     = require('@youwol/dataframe')
const geo    = require('../../dist/@youwol/geophysics')
const fs     = require('fs')
//let { printProgress } = require('./utils')
const { exit } = require('process')

// -----------------------------------------------------------------
// Arch is not needed ;-)
// -----------------------------------------------------------------

const dataframe  = io.decodeGocadTS( fs.readFileSync('/Users/fmaerten/data/arch/test-inversion-joints/simulations-grid.ts', 'utf8') )[0]
const dataframe2 = io.decodeGocadTS( fs.readFileSync('/Users/fmaerten/data/arch/test-inversion-joints/results_grid_forward.ts', 'utf8') )[0]

dataframe.series['n'] = dataframe2.series['n']
dataframe2.remove(['S', 'S1', 'S2', 'S3', 'U'])

const data = new geo.JointData({
    dataframe,
    measure: 'n',
    useNormals: false,
    compute: new Array(6).fill(0).map( (v,i) => `S${i+1}` )
})

function generate(alpha) {
    dataframe2.series['cost']   = data.costs(alpha)

    const stress = geo.forward.attribute({
        simulations: dataframe,
        name: 'S',
        alpha
    })

    dataframe2.series['joints'] = geo.generateJoints({stress, projected: false})
    dataframe2.series['stylos'] = geo.generateStylolites({stress, projected: false})
    dataframe2.series['S']      = stress

    // Translate for the visu
    dataframe2.series['positions'] = df.apply(dataframe2.series['positions'], item => [item[0]+2, item[1], item[2]] )

    const bufferOut = io.encodeGocadTS(dataframe2)
    fs.writeFileSync('/Users/fmaerten/data/arch/test-inversion-joints/result-inversion-joints.gcd', bufferOut, 'utf8', err => {})
}

if (1) {
    // Checking synthetic model
    const alpha = geo.gradientPressureMapping([
        141,
        0.75,
        0.82,
        2000,
        1000,
        6.5e7
    ])
    console.log('BEST cost' , data.cost(alpha) )
    generate(alpha)
    exit(0)
}
else {
    // Inversion
    const result = geo.monteCarlo({
        data: [data],
        alpha: {
            // [theta, Kh, KH, rockDensity, cavityDensity, shift]
            mapping: geo.gradientPressureMapping,
            min: [0,   0, 0, 2000, 1000, -1e9],
            max: [180, 5, 5, 2000, 1000,  1e9]
        },
        onProgress: (i,v) => console.log(i+": "+v+"%"),
        onMessage: msg => console.log(msg)
    }, 5000)

    console.log('inversion result:', result)
    generate(result.alpha)
}
