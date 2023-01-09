/**
 * Inverst for the far field stress + 1 pressure in the Fernandina
 * magma chamber
 */
const io = require('@youwol/io')
const df = require('@youwol/dataframe')
const math = require('@youwol/math')
const geo = require('../../../dist/@youwol/geophysics')
const fs = require('fs')
const { apply } = require('@youwol/dataframe')

const Rmag = 2500
const Rsed = 2000

// -----------------------------------------------------------------

const buffer = fs.readFileSync(
    '/Users/fmaerten/data/arch/galapagos-all/model2/simulations-dykes.xyz',
    'utf8',
)
const dataframe = io.decodeXYZ(buffer)[0]

const dikes = new geo.JointData({
    dataframe,
    measure: 'n',
    compute: new Array(6).fill(0).map((v, i) => `S${i + 1}`),
})

// const user = [99, 0.68, 0.7, Rsed, Rmag, 9e7]
// const user = [145, 0.033, 0.025, 2000, 1000, -2e7]
const user = [154, 0.45, 0.44, 2000, 2400, -25577758]

const alpha = geo.gradientPressureMapping(user)

// const compute = new Array(6).fill(0).map( (v,i) => `S${i+1}` )
// const stress = math.weightedSum( compute.map( name => dataframe.series[name] ), alpha )
// const eigen  = math.eigenVector(stress)
// const traces = eigen.map(v => [v[1], -v[0], 0])

dataframe.series['newN'] = apply(dikes.generate(alpha), (n) => [-n[1], n[0], 0])
dataframe.series['n'] = apply(dataframe.series.n, (n) => [-n[1], n[0], 0])
dataframe.series['cost'] = dikes.costs(alpha)

console.log('inversion result:', alpha)

const bufferOut = io.encodeXYZ(dataframe, {
    //delimiter: ' \t',
    //fixed: 8
})
fs.writeFile(
    '/Users/fmaerten/data/arch/galapagos-all/model2/result-check-dikes.xyz',
    bufferOut,
    'utf8',
    (err) => {},
)
