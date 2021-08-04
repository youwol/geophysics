/**
 * Generate the synthetic dikes using the inverted parameters
 */
const io     = require('@youwol/io')
const df     = require('@youwol/dataframe')
const math   = require('@youwol/math')
const geo    = require('../../../dist/@youwol/geophysics')
const fs     = require('fs')

let userParameters = [
    164.9,   // theta
    0.135,   // Rh
    0.294,   // RH
    2900,    // Rsed
    2680,    // Rmag
    -1021698 // shift
]

const Rmag   = 2680 // Sediment density (kg/m3)
const Rsed   = 2900 // Sediment density (kg/m3)
const nu     = 0.25 // Sediment Poisson's ratio
const E      = 30e9  // Sediment Young's modulus (Pa)

const buffer    = fs.readFileSync('./simulations.xyz', 'utf8')
let   dataframe = io.decodeXYZ( buffer )[0]

const alpha = geo.gradientPressureMapping(userParameters)

const dikes = new geo.StyloliteData({
    dataframe,
    measure: 'n',
    compute: new Array(6).fill(0).map( (v,i) => `stress${i+1}` )
})

const newDf = df.DataFrame.create({
    series: {
        positions: dataframe.series['positions'],
        n        : dataframe.series['n'],
        newN     : dikes.generate(alpha),
        cost     : dikes.costs(alpha)
    }
})

console.log( math.minMax(dikes.costs(alpha)) )

const bufferOut = io.encodeXYZ(newDf, {
    delimiter: ' \t',
    fixed: 8
})
fs.writeFile('result-forward-dikes.xyz', bufferOut, 'utf8', err => {})