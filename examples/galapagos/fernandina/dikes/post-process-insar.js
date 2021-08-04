/**
 * Generate the synthetic dikes using the inverted parameters
 */
const io     = require('@youwol/io')
const df     = require('@youwol/dataframe')
const geom   = require('@youwol/geometry')
const math   = require('@youwol/math')
const geo    = require('../../../dist/@youwol/geophysics')
const fs     = require('fs')
const { apply, map } = require('@youwol/dataframe')
const { minMax } = require('@youwol/math')

let userParameters = [
    91.2,
    0.4,
    4.9,
    2900,
    2680,
    -395851290
]

const Rmag   = 2680 // Sediment density (kg/m3)
const Rsed   = 2900 // Sediment density (kg/m3)
const nu     = 0.25 // Sediment Poisson's ratio
const E      = 30e9  // Sediment Young's modulus (Pa)
const LOS    = [0.01, -0.1, -0.9856]

const dataframe = io.decodeXYZ( fs.readFileSync('./simulations.xyz', 'utf8') )[0]
const dataframe2 = io.decodeXYZ( fs.readFileSync('./insar.xyz', 'utf8') )[0]
dataframe.series['insar'] = dataframe2.series['insar']

const insar = new geo.InsarData({
    dataframe,
    los: LOS,
    measure: 'insar',
    compute: new Array(6).fill(0).map( (v,i) => `displ${i+1}` )
})

const alpha = geo.gradientPressureMapping(userParameters)
const topo  = geom.triangulate(dataframe.series['positions'])

const newDf = df.DataFrame.create({
    series: {
        positions: dataframe.series['positions'],
        indices  : topo.series['indices'],
        insar    : dataframe.series['insar'],
        newInsar : insar.generate(alpha),
        cost     : insar.costs(alpha)
    }
})

const ratio = map( [newDf.series['insar'], newDf.series['newInsar']], ([i1, i2]) => i1/i2 ) 

console.log('ratio min/max:', minMax(ratio) )
console.log('cost min/max :', math.minMax(insar.costs(alpha)) )

const bufferOut = io.encodeGocadTS(newDf, {
    delimiter: ' \t',
    fixed: 8
})
fs.writeFile('result-forward-insar.gcd', bufferOut, 'utf8', err => {})
