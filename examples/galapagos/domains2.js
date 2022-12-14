const io = require('@youwol/io')
const df = require('@youwol/dataframe')
const math = require('@youwol/math')
const geo = require('../../dist/@youwol/geophysics')
const geom = require('../../../geometry/dist/@youwol/geometry')
const fs = require('fs')
const { exit } = require('process')

const path = '/Users/fmaerten/data/arch/galapagos-all/model2/'
const pathData =
    '/Users/fmaerten/data/arch/galapagos-all/model2/dikes_georef/points.xyz/'
const dataFilename = 'simulations-All_Galapagos_dikes.xyz'

// const user = [
//     17,
//     0.50, // 0.006
//     0.51, // 0.022
//     2000,
//     2600,
//     79094446,
//      3478222,
//     13552986,
//     19703592,
//     57414657,
//     72484578,
//     15611804
// ]

user = [14, 0.5752, 0.5757, 2000, 2600, 1.05e7]

// -----------------------------------------------------------------

const buffer = fs.readFileSync(pathData + dataFilename, 'utf8')
const dataframe = io.decodeXYZ(buffer)[0]

const dikes = new geo.JointData({
    dataframe: dataframe,
    measure: 'n',
    compute: new Array(user.length).fill(0).map((v, i) => `S${i + 1}`),
    projected: true,
    useNormals: true,
    useAngle: true,
})

const mapping = geo.gradientPressureMapping

// --------------------------

// Multiple domains (test)
if (1) {
    const n = 30
    const surface = geom.generateRectangle({
        a: 1,
        b: 1,
        na: n,
        nb: n,
        center: [0.5, 0.5, 0],
    })
    fs.writeFileSync(
        path + `/domain-empty.ts`,
        io.encodeGocadTS(surface),
        'utf8',
        (err) => {},
    )
    const positions = surface.series.positions.map((v) => v) // duplicate

    const densityMin = 2000
    const densityMax = 3000
    const shiftMin = 1e5
    const shiftMax = 1e7
    const Rmin = 0
    const Rmax = 1

    const N = 10
    for (let i = 0; i < N; ++i) {
        console.log('doing domain', i + 1)
        surface.series['cost'] = positions.map((p) => {
            const userAlpha = [...user]
            userAlpha[1] = Rmin + (Rmax - Rmin) * p[0]
            userAlpha[2] = Rmin + (Rmax - Rmin) * p[0]
            userAlpha[4] =
                densityMin + (i * (densityMax - densityMin)) / (N - 1)
            userAlpha[5] = shiftMin + (shiftMax - shiftMin) * p[1]
            return dikes.cost(mapping(userAlpha))
        })
        console.log(math.minMax(surface.series['cost']))
        surface.series['positions'] = surface.series['positions'].map((v) => [
            v[0] + 1.1,
            v[1],
            v[2],
        ])
        fs.writeFileSync(
            path + `/domain-${i}.ts`,
            io.encodeGocadTS(surface),
            'utf8',
            (err) => {},
        )
        console.log('')
    }
}

// One domain (original)
if (0) {
    let surface
    if (0) {
        const buffer = fs.readFileSync(path + 'disk.ts', 'utf8')
        surface = io.decodeGocadTS(buffer)[0]
    } else {
        surface = geom.generateEllipse({
            a: 1,
            b: 1,
            nbRings: 30,
            density: 8,
            center: [0, 0, 0],
        })
    }

    const positions = surface.series.positions
    console.log(math.minMax(positions))
    console.log(positions.count)

    surface.series['cost'] = positions.map((p) => {
        const r = Math.sqrt(p[0] ** 2 + p[1] ** 2)
        let theta = 90 - (Math.atan2(p[1], p[0]) * 180) / Math.PI
        let Rh = (1 - r) * user[2]
        const alpha = mapping([theta, Rh, user[2], user[3], user[4], user[5]])
        return dikes.cost(alpha)
    })

    surface.series['cost'] = surface.series['cost'].map(
        (v) => (v * 180) / Math.PI,
    )
    fs.writeFileSync(
        path + `domain-theta-Rh-0.ts`,
        io.encodeGocadTS(surface),
        'utf8',
        (err) => {},
    )
}
