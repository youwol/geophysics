const io = require('@youwol/io')
const df = require('@youwol/dataframe')
const math = require('@youwol/math')
const geo = require('../../dist/@youwol/geophysics')
const geom = require('../../../geometry/dist/@youwol/geometry')
const fs = require('fs')
const { exit } = require('process')

const path = '/Users/fmaerten/data/arch/spanish-peak'

// -----------------------------------------------------------------

class Axis {
    constructor(min, max) {
        this.min = min
        this.max = max
    }
}

class Theta extends Axis {
    constructor(min, max) {
        super(min, max)
    }
    setUser(user, p) {
        user[0] = this.value(p)
    }
    value(p) {
        return 90 - (Math.atan2(p[1], p[0]) * 180) / Math.PI
    }
}

class Rh extends Axis {
    constructor(min, max) {
        super(min, max)
    }
    setUser(user, p) {
        user[1] = this.value(p)
        user[2] = this.max
    }
    value(p) {
        const r = Math.sqrt(p[0] ** 2 + p[1] ** 2)
        return this.min + (1 - r) * (this.max - this.min)
    }
}

class RHoverRh extends Axis {
    constructor(min, max) {
        super(min, max)
    }
    setUser(user, p) {
        user[1] = this.value(p)
        user[2] = this.max
    }
    value(p) {
        const r = Math.sqrt(p[0] ** 2 + p[1] ** 2)
        return this.min + (1 - r) * (this.max - this.min)
    }
}

class Alpha {
    constructor(xAxis, yAxis, user) {
        this.xAxis = xAxis
        this.yAxis = yAxis
        this.user = user
        this.mapping = geo.gradientPressureMapping
    }

    value(p) {
        return this.mapping(this.alpha(p))
    }

    alpha(p) {
        const alpha = [...this.user] // copy
        this.xAxis.setUser(alpha, p)
        this.yAxis.setUser(alpha, p)
        return alpha
    }
}

// ---------------------------------------------------------

const buffer = fs.readFileSync(path + '/simulations-dykes.xyz', 'utf8')
const dataframe = io.decodeXYZ(buffer)[0]

const dikes = new geo.JointData({
    dataframe,
    measure: 'n',
    //weights: 'w',
    compute: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
    projected: true,
    useNormals: true,
    useAngle: true,
})

let user = [
    -1, -1, 0.5, 2900, 2600,
    //6.558e8
    2e7,
]

const x = new Theta(0, 180)
const y = new Rh(0.4, user[2])
const alpha = new Alpha(x, y, user)

// Multiple domains
if (0) {
    const surface = geom.generateEllipse({
        a: 1,
        b: 1,
        nbRings: 15,
        density: 8,
        center: [0, 0, 0],
    })
    fs.writeFileSync(
        path + `/domain-empty.ts`,
        io.encodeGocadTS(surface),
        'utf8',
        (err) => {},
    )
    const positions = surface.series.positions.map((v) => v) // duplicate

    console.log(positions.count)

    for (let i = 0; i <= 10; ++i) {
        y.max = i / 10
        console.log('Rh max:', y.max)
        surface.series['cost'] = positions.map((p) => {
            return (dikes.cost(alpha.value(p)) * 180) / Math.PI
        })
        console.log(math.minMax(surface.series['cost']))
        surface.series['positions'] = surface.series['positions'].map((v) => [
            v[0] + 1.1,
            v[1],
            v[2],
        ])
        fs.writeFileSync(
            path + `/domain-theta-Rh-${i}.ts`,
            io.encodeGocadTS(surface),
            'utf8',
            (err) => {},
        )
    }
}

// One domain
if (1) {
    // nbRings: 90
    const surface = geom.generateEllipse({
        a: 2,
        b: 2,
        nbRings: 20,
        density: 8,
        center: [0, 0, 0],
    })
    //fs.writeFileSync(path + `/domain-empty.ts`, io.encodeGocadTS(surface), 'utf8', err => {})
    const positions = surface.series.positions.map((v) => v) // duplicate

    console.log(math.minMax(positions))

    //y.max = user[2] // already done in the ctor
    surface.series['cost'] = positions.map((p) => {
        return (dikes.cost(alpha.value(p)) * 180) / Math.PI
    })
    fs.writeFileSync(
        path + `/domain-theta-Rh-inv.ts`,
        io.encodeGocadTS(surface),
        'utf8',
        (err) => {},
    )
}
