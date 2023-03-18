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

const deg2rad = a => a*Math.PI/180

function stressFromRb(Theta, Rb) {
    const theta = (Theta * Math.PI) / 180
    const sin = Math.sin(theta)
    const cos = Math.cos(theta)
    if (Rb < 1) {
        const R = Rb
        return [R * sin ** 2, R * cos * sin, R * cos ** 2, 1]
    } else if (Rb < 2) {
        const R = 2 - Rb
        return [sin ** 2, cos * sin, cos ** 2, R]
    } else {
        const R = Rb - 2
        return [
            R * cos ** 2 + sin ** 2,
            (1 - R) * cos * sin,
            R * sin ** 2 + cos ** 2,
        ]
    }
}

function stressFromAlpha(Theta, Alpha) {
    const cos = Math.cos
    const sin = Math.sin
    const PI = Math.PI
    const sqrt2 = Math.sqrt(2)
    const alpha = (Alpha * Math.PI) / 180
    const theta = (Theta * PI) / 180
    return [
        sin(alpha) - cos(alpha) * cos(theta) ** 2 + sqrt2,
        cos(alpha) * sin(theta) * cos(theta) + sqrt2,
        sin(alpha) - cos(alpha) * sin(theta) ** 2 + sqrt2,
        sqrt2,
    ]
}

function stressFromAlphaBar(Theta, AlphaBar) {
    const cos = Math.cos
    const sin = Math.sin
    const PI = Math.PI
    const sqrt2 = Math.sqrt(2)
    let alpha = (AlphaBar < 0 ? AlphaBar*2 : AlphaBar) * Math.PI / 180
    const theta = (Theta * PI) / 180
    return [
        sin(alpha) - cos(alpha) * cos(theta) ** 2 + sqrt2,
        cos(alpha) * sin(theta) * cos(theta) + sqrt2,
        sin(alpha) - cos(alpha) * sin(theta) ** 2 + sqrt2,
        sqrt2,
    ]
}

function doRbDomain() {
    for (let i = 0; i < nx; ++i) {
        const Rb = (3 * i) / (nx - 1)
        for (let j = 0; j < ny; ++j) {
            const theta = (180 * j) / (ny - 1)
            const stress = stressFromRb(theta, Rb)
            xx.push(stress[0])
            xy.push(stress[1])
            yy.push(stress[2])
            zz.push(stress[3])
            positions.push(i, j, 0)
        }
    }
}

function doAlphaDomain() {
    for (let i = 0; i < nx; ++i) {
        const alpha = -90 + (i / (nx - 1)) * 180
        for (let j = 0; j < ny; ++j) {
            const theta = (180 * j) / (ny - 1)
            const stress = stressFromAlpha(theta, alpha)
            xx.push(stress[0])
            xy.push(stress[1])
            yy.push(stress[2])
            zz.push(stress[3])
            positions.push(i, j, 0)
        }
    }
}

function doAlphaBarDomain() {
    for (let i = 0; i < nx; ++i) {
        const alpha = -45 + (i / (nx - 1)) * 135
        for (let j = 0; j < ny; ++j) {
            const theta = (180 * j) / (ny - 1)
            const stress = stressFromAlphaBar(theta, alpha)
            xx.push(stress[0])
            xy.push(stress[1])
            yy.push(stress[2])
            zz.push(stress[3])
            positions.push(i, j, 0)
        }
    }
}

function doCircularDomain(full=false) {
    const r = 0 // inner radius
    let stop = 180
    if (full) {
        stop *= 2
    }

    for (let i = 0; i < nx; ++i) {
        const Rb = (3 * i) / (nx - 1)
        for (let j = 0; j < ny; ++j) {
            const theta = (stop * j) / (ny - 1)
            const ang = deg2rad(theta)
            const x =  (Rb + r) * Math.sin(ang)
            const y = -(Rb + r) * Math.cos(ang)
            const stress = stressFromRb(theta, Rb)
            xx.push(stress[0])
            xy.push(stress[1])
            yy.push(stress[2])
            zz.push(stress[3])
            positions.push(x, y, 0)
        }
    }
}

// doAlphaDomain()
// doAlphaBarDomain()
// doRbDomain()
doCircularDomain()

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

console.log(stressFromAlpha(45, -45))
console.log(stressFromRb(45, 0.5))
