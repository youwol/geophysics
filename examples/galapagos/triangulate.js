const io = require('@youwol/io')
const df = require('@youwol/dataframe')
const math = require('@youwol/math')
const geo = require('../../dist/@youwol/geophysics')
const geom = require('../../../geometry/dist/@youwol/geometry')
const fs = require('fs')
const { exit } = require('process')

const buffer = fs.readFileSync(
    '/Users/fmaerten/data/arch/galapagos-all/model2/result-forward-dikes.xyz',
    'utf8',
)
const dataf = io.decodeXYZ(buffer)[0]

const dataframe = df.DataFrame.create({
    series: {
        positions: dataf.series.positions,
        n: dataf.series.n,
        newN: dataf.series.newN,
    },
})

const dataframe2 = geom.triangulate(dataframe.series.positions)
dataframe2.series['n'] = dataframe.series.n
dataframe2.series['newN'] = dataframe.series.newN

fs.writeFile(
    '/Users/fmaerten/data/arch/galapagos-all/model2/result-forward-dikes.ts',
    io.encodeGocadTS(dataframe2),
    'utf8',
    (err) => {},
)
