const io = require('@youwol/io')
const df = require('@youwol/dataframe')
const math = require('@youwol/math')
const geo = require('../../dist/@youwol/geophysics')
const arch = require('../../../../../platform/components/arch-node/build/Release/arch.node')
const fs = require('fs')

const path = '/Users/fmaerten/data/arch/spanish-peak'
const buffer = fs.readFileSync(path + '/result-forward-dikes.xyz', 'utf8')

const dataframe = io.decodeXYZ(buffer)[0]

const df2 = df.DataFrame.create({
    series: {
        positions: dataframe.series.positions,
        cost: dataframe.series.cost.map((v) => (v * 180) / Math.PI),
    },
})

const bufferOut = io.encodeXYZ(df2)
fs.writeFileSync(path + '/result-costs.xyz', bufferOut, 'utf8', (err) => {})
