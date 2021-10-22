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
dataframe.series['insar'] = dataframe2.series['insar']

const insar = new geo.InsarData({
    dataframe,
    los: params.LOS,
    normalize: true,
    measure: 'insar',
    //mapping: geo.gradientPressureMapping,
    compute: new Array(6).fill(0).map( (v,i) => `displ${i+1}` )
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
    console.log('cost' , insar.cost(alpha) )

    dataframe2.series['cost']   = insar.costs(alpha)
    const ins = insar.generate( alpha )
    dataframe2.series['insar']  = ins
    dataframe2.series['fringes'] = geo.generateFringes(ins, params.fringe)

    // translate for the visu
    dataframe2.series['positions'] = df.apply(dataframe2.series['positions'], item => [item[0]+22000, item[1], item[2]] )

    const bufferOut = io.encodeGocadTS(dataframe2)
    fs.writeFile('result-insar.gcd', bufferOut, 'utf8', err => {})

    return
}




const result = geo.monteCarlo({
    data: [insar],
    alpha: {
        mapping: geo.gradientPressureMapping,
        min: [0,   params.RsMin, params.RvMin, params.rockDensity, params.cavityDensity, params.shiftMin],
        max: [180, params.RsMax, params.RvMax, params.rockDensity, params.cavityDensity, params.shiftMax]
    },
    onProgress: (i,v) => printProgress(i+": "+v+"%"),
    onMessage: msg => console.log(msg)
}, params.nbSimuls)

console.log('inversion result:', result )

const alpha = result.alpha

dataframe2.series['cost']   = insar.costs(alpha)

const displ = geo.forward.attribute({simulations: dataframe, alpha, name: 'displ'})
dataframe2.series['displ']  = displ
const ins = geo.generateInsar( {displ, LOS: params.LOS} )
dataframe2.series['insar']  = ins
dataframe2.series['fringes'] = geo.generateFringes(ins, params.fringe)

// translate for the visu
dataframe2.series['positions'] = df.apply(dataframe2.series['positions'], item => [item[0]+22000, item[1], item[2]] )

const bufferOut = io.encodeGocadTS(dataframe2)
fs.writeFile('result-insar.gcd', bufferOut, 'utf8', err => {})