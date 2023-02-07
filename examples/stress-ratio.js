const dataframe = require('@youwol/dataframe')
const geom = require('../../geometry/dist/@youwol/geometry')
const io = require('@youwol/io')
const fs = require('fs')

const nx = 150
const ny = 150

const positions = []
const xx = []
const xy = []
const yy = []
const zz = []

function doRb() {
    for (let i = 0; i < nx; ++i) {
        const Rb = (3 * i) / (nx - 1)
        for (let j = 0; j < ny; ++j) {
            const theta = (Math.PI * j) / (ny - 1)
            const sin = Math.sin(theta)
            const cos = Math.cos(theta)
            if (Rb < 1) {
                const R = Rb
                xx.push(R * sin ** 2)
                xy.push(R * cos * sin)
                yy.push(R * cos ** 2)
                zz.push(1)
            } else if (Rb < 2) {
                const R = 2 - Rb
                xx.push(sin ** 2)
                xy.push(cos * sin)
                yy.push(cos ** 2)
                zz.push(R)
            } else {
                const R = Rb - 2
                xx.push(R * cos ** 2 + sin ** 2)
                xy.push((1 - R) * cos * sin)
                yy.push(R * sin ** 2 + cos ** 2)
                zz.push(0)
            }
            positions.push(i, j, 0)
        }
    }
}

function doAlpha() {
    const cos = Math.cos
    const sin = Math.sin
    const PI = Math.PI
    const sqrt2 = Math.sqrt(2)
    for (let i = 0; i < nx; ++i) {
        const alpha = -PI / 2 + (i / (nx - 1)) * PI
        for (let j = 0; j < ny; ++j) {
            const theta = (PI * j) / (ny - 1)
            xx.push(sin(alpha) - cos(alpha) * cos(theta) ** 2 + sqrt2)
            xy.push(cos(alpha) * sin(theta) * cos(theta) + sqrt2)
            yy.push(sin(alpha) - cos(alpha) * sin(theta) ** 2 + sqrt2)
            zz.push(sqrt2)

            positions.push(i, j, 0)
        }
    }
}

// doAlpha()
doRb()

const df = geom.triangulate(
    dataframe.Serie.create({ array: positions, itemSize: 3 }),
)

df.series.xx = dataframe.Serie.create({ array: xx, itemSize: 1 })
df.series.xy = dataframe.Serie.create({ array: xy, itemSize: 1 })
df.series.yy = dataframe.Serie.create({ array: yy, itemSize: 1 })
df.series.zz = dataframe.Serie.create({ array: zz, itemSize: 1 })

fs.writeFileSync(
    '/Users/fmaerten/data/mesh/stress-ratio.ts',
    io.encodeGocadTS(df),
    'utf8',
    (_err) => {},
)
