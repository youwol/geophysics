const io     = require('@youwol/io')
const df     = require('@youwol/dataframe')
const math   = require('@youwol/math')
const geo    = require('../../dist/@youwol/geophysics')
const geom   = require('../../../geometry/dist/@youwol/geometry')
const fs     = require('fs')
const { exit } = require('process')

const path     = '/Users/fmaerten/data/arch/galapagos-all/model2/dikes_georef/points.xyz'

// -----------------------------------------------------------------

const dataFiles  = []

const buffer    = fs.readFileSync(path + '/simulations-All_Galapagos_dikes.xyz', 'utf8')
const dataframe = io.decodeXYZ(buffer)[0]

const dikes = new geo.JointData({
    dataframe,
    measure: 'n',
    weights: 'w',
    compute: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
    projected: true,
    useNormals: true
})

const mapping =  geo.gradientPressureMapping

// --------------------------
const xname = 'Rh'
const xmin  = 0
const xmax  = 1

const yname = 'RH'
const ymin  = 0
const ymax  = 1

const zname = 'shift'
const zmin  = 0
const zmax  = 1e9

const n     = 30
// --------------------------

if (0) {
    const nz = 10
    const surface = geom.generateRectangle( {a:1, b:1, na:n, nb:n, center:[0.5, 0.5, 0]} )
    const positions = surface.series.positions

    for (let i=0; i<nz; ++i) {
        const z = zmin + i*(zmax-zmin)/(nz-1)
        surface.series['cost'] = positions.map( p => {
            const x = xmin + p[0]*(xmax-xmin)
            const y = ymin + p[1]*(ymax-ymin)
            const alpha = mapping( [26.44, x, y, 2000, 2600, z] )
            return dikes.cost(alpha)
        })
        surface.series.positions = positions.map( p => [p[0], p[1], i/10])
        fs.writeFile(path + `/domain-theta-Rh-${i}.ts`, io.encodeGocadTS(surface), 'utf8', err => {})
        console.log(i+1,'/', nz)
    }
}


if (1) {
    let bufferOut = ''
    bufferOut += `# x: ${xname} ${xmin} ${xmax} ${n}\n`
    bufferOut += `# y: ${yname} ${ymin} ${ymax} ${n}\n`
    bufferOut += `# z: ${zname} ${zmin} ${zmax} ${n}\n`
    bufferOut += '# x y z cost\n'
    for (let i=0; i<n; ++i) {
        const x = xmin + i*(xmax-xmin)/(n-1)
        for (let j=0; j<n; ++j) {
            const y = ymin + j*(ymax-ymin)/(n-1)
            for (let k=0; k<n; ++k) {
                const z = zmin + k*(zmax-zmin)/(n-1)
                const alpha = mapping( [86, x, y, 2900, 2000, z] )
                const cost = dikes.cost(alpha)
                bufferOut += `${i/(n-1)} ${j/(n-1)} ${k/(n-1)} ${cost}\n`
            }
        }
        console.log(i,'/', n)
    }
    fs.writeFile(path + '/domain-theta-Rh.xyz', bufferOut, 'utf8', err => {})
}
