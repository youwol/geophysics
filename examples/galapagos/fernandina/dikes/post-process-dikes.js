/**
 * Generate the synthetic dikes using the inverted parameters
 */
const io     = require('@youwol/io')
const df     = require('@youwol/dataframe')
const math   = require('@youwol/math')
const geo    = require('../../../../dist/@youwol/geophysics')
const fs     = require('fs')

let userParameters = [
    25.245411502969937,
    0.4608218875000192,
    0.4641735509667533,
    2900,
    2680,
    -94627559.11294192
]

const Rmag   = 2680 // Sediment density (kg/m3)
const Rsed   = 2900 // Sediment density (kg/m3)
const nu     = 0.25 // Sediment Poisson's ratio
const E      = 30e9  // Sediment Young's modulus (Pa)

const buffer    = fs.readFileSync('/Users/fmaerten/data/arch/galapagos-all/model2/simulations-dykes.xyz', 'utf8')
let   dataframe = io.decodeXYZ( buffer )[0]

const alpha = geo.gradientPressureMapping(userParameters)

const dikes = new geo.StyloliteData({
    dataframe,
    measure: 'n',
    compute: new Array(6).fill(0).map( (v,i) => `S${i+1}` )
})

const newDf = df.DataFrame.create({
    series: {
        positions: dataframe.series['positions'],
        n        : dataframe.series['n'],
        newN     : dikes.generate(alpha),
        cost     : dikes.costs(alpha)
    }
})

console.log( 'cost min/max:', math.minMax(dikes.costs(alpha)) )

const bufferOut = io.encodeXYZ(newDf, {
    delimiter: ' \t',
    fixed: 8
})
fs.writeFile('/Users/fmaerten/data/arch/galapagos-all/model2/result-forward-dikes.xyz', bufferOut, 'utf8', err => {})