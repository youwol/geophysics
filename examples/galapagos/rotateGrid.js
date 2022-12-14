const io = require('@youwol/io')
const df = require('@youwol/dataframe')
const math = require('@youwol/math')
const geo = require('../../dist/@youwol/geophysics')
const arch = require('../../../../../platform/components/arch-node/build/Release/arch.node')
const fs = require('fs')
const { mat } = require('@youwol/math')

const path = '/Users/fmaerten/data/arch/galapagos-all/model2'
const grids = io.decodeGocadTS(
    fs.readFileSync(path + '/' + 'forward-grid.ts', 'utf8'),
)

// Rotate the grid from vertical to horizontal
// Rotate also the vectors and matrices

function unpackSMatrix3(m) {
    return [
        [m[0], m[1], m[2]],
        [m[1], m[3], m[4]],
        [m[2], m[4], m[5]],
    ]
}

function packSMatrix3(m) {
    return [m[0][0], m[0][1], m[0][2], m[1][1], m[1][2], m[2][2]]
}

function rotateAxis(serie, AXIS, angleInDeg) {
    if (serie.itemSize === 3) {
        // See math.mat.matrix3
        let axis = 2

        if (AXIS === 'x' || AXIS === 'X') {
            axis = 0
        } else if (AXIS === 'y' || AXIS === 'Y') {
            axis = 1
        }

        const R = [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
        ]
        const c = Math.cos((angleInDeg * Math.PI) / 180.0)
        const s = Math.sin((angleInDeg * Math.PI) / 180.0)
        if (axis === 2) {
            R[0][0] = c
            R[0][1] = -s
            R[1][0] = s
            R[1][1] = c
            R[2][2] = 1
        } else if (axis === 0) {
            R[0][0] = 1
            R[1][1] = c
            R[1][2] = -s
            R[2][1] = s
            R[2][2] = c
        } else {
            R[0][0] = c
            R[0][2] = s
            R[2][0] = -s
            R[1][1] = 1
            R[2][2] = c
        }
        return serie.map((v) => {
            return mat.multVec(R, v)
        })
    } else if (serie.itemSize === 6) {
        return serie.map((m) => {
            return packSMatrix3(
                math.mat.rotate(unpackSMatrix3(m), angleInDeg, AXIS),
            )
        })
    }
    return undefined
}

grids.forEach((grid) => {
    Object.entries(grid.series).forEach((entry) => {
        const [key, serie] = entry

        if (key !== 'indices') {
            grid.series[key] = rotateAxis(serie, 'x', 90)
            console.log(grid.series[key])
            // const COS = Math.cos(Math.PI/2)
            // const SIN = Math.sin(Math.PI/2)
            // const rot = [
            //     [1,   0,   0],
            //     [0,  COS, SIN],
            //     [0, -SIN, COS]
            // ]

            // if (serie.itemSize === 3) {
            //     grid.series[key] = serie.map( v => {
            //         return [v[0], v[1]*COS + v[2]*SIN, -v[1]*SIN, v[2]*COS]
            //     })
            // }
            // else if (serie.itemSize === 6 || serie.itemSize === 9) {
            //     //math.multMat(rot, math.multMat(s, math.transpose(rot)))
            // }
        }
    })
})

fs.writeFileSync(
    path + '/forward-grid-rotated.ts',
    io.encodeGocadTS(grids, {
        expandAttributes: true,
    }),
    'utf8',
)
