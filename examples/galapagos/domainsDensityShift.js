const io     = require('@youwol/io')
const df     = require('@youwol/dataframe')
const math   = require('@youwol/math')
const geo    = require('../../dist/@youwol/geophysics')
const geom   = require('../../../geometry/dist/@youwol/geometry')
const fs     = require('fs')

const path     = '/Users/fmaerten/data/arch/galapagos-all/model2/'
const pathData = '/Users/fmaerten/data/arch/galapagos-all/model2/dikes_georef/points.xyz/'

// -----------------------------------------------------------------

const buffer    = fs.readFileSync(pathData + 'simulations-All_Galapagos_dikes.xyz', 'utf8')
const dataframe = io.decodeXYZ(buffer)[0]

const dikes = new geo.JointData({
    dataframe,
    measure   : 'n',
    compute   : new Array(6).fill(0).map( (v,i) => `S${i+1}` ),
    projected : true,
    useNormals: true,
    useAngle  : true
})

const mapping =  geo.gradientPressureMapping

user = [
    14,
    0.5752,
    0.5757,
    2000,
    2600,
    1.05e7
]

// --------------------------

// density
const xmin  = 2000
const xmax  = 3000

// shift
const ymin  = 1e6
const ymax  = 1e8
    
const surface = geom.generateRectangle({a: 1, b: 1, na: 30, nb: 30, center: [0.5,0.5,0]})
const positions = surface.series.positions
console.log(math.minMax(positions))
console.log(positions.count)

surface.series['cost'] = positions.map( p => {
    const alpha = [...user]
    alpha[4] = xmin + p[0]*(xmax-xmin)
    alpha[5] = ymin + p[1]*(ymax-ymin)
    return dikes.cost( mapping(alpha) )
})

surface.series['cost'] = surface.series['cost'].map( v => v*180/Math.PI)
fs.writeFileSync(path + `domain-density-shift.ts`, io.encodeGocadTS(surface), 'utf8', err => {})
