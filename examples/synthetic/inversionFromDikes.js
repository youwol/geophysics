/**
 * Invert for the far field stress + 1 pressure ina cavity
 */
const io     = require('@youwol/io')
const df     = require('@youwol/dataframe')
const geo    = require('../../dist/@youwol/geophysics')
const fs     = require('fs')
let params = require('./user-params')
let { printProgress } = require('./utils')
const { exit } = require('process')

// -----------------------------------------------------------------
// Arch is not needed ;-)
// -----------------------------------------------------------------

const dataframe  = io.decodeGocadTS( fs.readFileSync('./simulations.gcd', 'utf8') )[0]
const dataframe2 = io.decodeGocadTS( fs.readFileSync('./data.gcd', 'utf8') )[0]
dataframe.series['dikes'] = dataframe2.series['dikes']
dataframe2.remove('dikes')

const dikes = new geo.DikeData({
    dataframe,
    measure: 'dikes',
    useNormals: false,
    compute: new Array(6).fill(0).map( (v,i) => `stress${i+1}` )
})

// Only testing, no inversion...
if (0) {
    // Generate alpha from user-defined space
    const alpha = geo.gradientPressureMapping([
        params.theta, 
        params.Rh, 
        params.RH, 
        params.rockDensity, 
        params.cavityDensity, 
        params.shift
    ])
    if (params.remote === false) {
        alpha[0]=0
        alpha[1]=0
        alpha[2]=0
        alpha[3]=0
    }

    console.log('alpha', alpha )
    console.log('cost' , dikes.cost(alpha).toFixed(10) )

    const stress = geo.forward.attribute({
        simulations: dataframe,
        name: 'stress',
        alpha,
        startIndex: 1
    })

    dataframe2.series['cost'] = dikes.costs(alpha)
    dataframe2.series['iDikes']  = geo.generateDikes({stress, projected: true})

    // Translate for the visu
    dataframe2.series['positions'] = df.apply(dataframe2.series['positions'], item => [item[0]+2, item[1], item[2]] )

    const bufferOut = io.encodeGocadTS(dataframe2)
    fs.writeFile('result-dikes.gcd', bufferOut, 'utf8', err => {})

    return
}




const result = geo.monteCarlo({
    data: [dikes],
    alpha: {
        // [theta, Rh, RH, rockDensity, cavityDensity, shift]
        mapping: geo.gradientPressureMapping,
        // min: [0,   0, 0, Rsed, 1500, -1e9],
        // max: [180, 5, 5, Rsed, 3000,  1e9]
        min: [0,   params.RsMin, params.RvMin, params.rockDensity, params.cavityDensity, params.shiftMin],
        max: [180, params.RsMax, params.RvMax, params.rockDensity, params.cavityDensity, params.shiftMax]
    },
    onProgress: (i,v) => printProgress(i+": "+v+"%"),
    onMessage: msg => console.log(msg)
}, params.nbSimuls)

/*
As an example, from https://physpet.ess.washington.edu/wp-content/uploads/sites/13/2016/02/Galapagoes-magma-chambers.pdf
we have an estimate of the Fernandina magma density, page 62: 2680 kg/m3
*/


console.log('inversion result:', result )
const alpha = result.alpha

dataframe2.series['cost']   = dikes.costs(alpha)

const stress = geo.forward.attribute({
    simulations: dataframe,
    name: 'stress',
    alpha
})

dataframe2.series['iDikes']  = geo.generateDikes({stress, projected: true})

// Translate for the visu
dataframe2.series['positions'] = df.apply(dataframe2.series['positions'], item => [item[0]+2, item[1], item[2]] )

const bufferOut = io.encodeGocadTS(dataframe2)
fs.writeFile('result-dikes.gcd', bufferOut, 'utf8', err => {})
