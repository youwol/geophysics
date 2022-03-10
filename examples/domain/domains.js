
/*



                TO BE CONTINUATED

But we have a design problem since the domain is circular:
    - which axis is the radius and the other one the theta ?


*/


const io     = require('@youwol/io')
const df     = require('@youwol/dataframe')
const math   = require('@youwol/math')
const geo    = require('../../dist/@youwol/geophysics')
const geom   = require('../../../geometry/dist/@youwol/geometry')
const fs     = require('fs')
const { exit } = require('process')


if (process.argv.length < 3) {
    printHelp()
    exit(1)
}

function getData(name, parameters, dataframe, args) {
    parameters['dataframe'] = dataframe
    parameters['compute']   = new Array(args.inverse.dim).fill(0).map( (v,i) => `${parameters.compute}${i+1}` )

    if (name==='joint' || name==='dyke' || name==='dike') return new geo.JointData(parameters)
    if (name==='stylolite') return new geo.StyloliteData(parameters)

    return undefined
}

class Axis {
    constructor(min, max) {
        this.min   = min
        this.max   = max
    }
}

class Theta extends Axis {
    constructor(min, max) {
        super(min, max, 0)
    }
    setUser(user, p) {
        user[0] = this.value(p)
    }
    value(p) {
        return 90 - Math.atan2(p[1], p[0]) * 180 / Math.PI
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
        const r = Math.sqrt(p[0]**2 + p[1]**2)
        return (1-r) * (this.max - this.min)
    }
}

class Density extends Axis {
    constructor(min, max) {
        super(min, max)
    }
    setUser(user, p) {
        user[4] = this.value(p)
    }
    value(p) {
        const r = Math.sqrt(p[0]**2 + p[1]**2)
        return r * (this.max - this.min)
    }
}

class Shift extends Axis {
    constructor(min, max) {
        super(min, max)
    }
    setUser(user, p) {
        user[5] = this.value(p)
    }
    value(p) {
        const r = Math.sqrt(p[0]**2 + p[1]**2)
        return r * (this.max - this.min)
    }
}

class Alpha {
    constructor(xAxis, yAxis, user) {
        this.xAxis = xAxis
        this.yAxis = yAxis
        this.user  = user
        this.mapping = geo.gradientPressureMapping
    }

    value(p) {
        return this.mapping( this.alpha(p) )
    }

    alpha(p) {
        const alpha = [...this.user] // copy
        this.xAxis.setUser(alpha, p)
        this.yAxis.setUser(alpha, p)
        return alpha
    }
}

// ---------------------------------------------------------

const params = JSON.parse( fs.readFileSync(process.argv[2], 'utf8') )

const buffer    = fs.readFileSync(params.path + params.data.path + params.path.filename, 'utf8')
const dataframe = io.decodeXYZ(buffer)[0]

const data = getData(params.data.type, params.data.parameters, dataframe, params)

let user = params.solution.alpha

const x     = new Theta(0, 180)
const y     = new Rh   (0, user[2])
const alpha = new Alpha(x, y, user)


if (1) {
    const surface = geom.generateEllipse({a:1, b:1, nbRings:15, density:8, center:[0, 0, 0]})
    fs.writeFileSync(path + `/domain-empty.ts`, io.encodeGocadTS(surface), 'utf8', err => {})
    const positions = surface.series.positions.map( v => v) // duplicate

    console.log(positions.count)

    for (let i=0; i<=10; ++i) {
        y.max = i/10
        console.log('Rh max:', y.max)
        surface.series['cost'] = positions.map( p => {
            return dikes.cost( alpha.value(p) ) * 180 / Math.PI
        })
        console.log(math.minMax(surface.series['cost']))
        surface.series['positions'] = surface.series['positions'].map( v => [v[0]+1.1, v[1], v[2]])
        fs.writeFileSync(path + `/domain-theta-Rh-${i}.ts`, io.encodeGocadTS(surface), 'utf8', err => {})
    }
}

if (0) {
    // nbRings: 90
    const surface = geom.generateEllipse({a:1, b:1, nbRings:15, density:8, center:[0, 0, 0]})
    fs.writeFileSync(path + `/domain-empty.ts`, io.encodeGocadTS(surface), 'utf8', err => {})
    const positions = surface.series.positions.map( v => v) // duplicate

    y.max = user[2]
    surface.series['cost'] = positions.map( p => {
        return dikes.cost( alpha.value(p) ) * 180 / Math.PI
    })
    fs.writeFileSync(path + `/domain-theta-Rh-inv.ts`, io.encodeGocadTS(surface), 'utf8', err => {})
}
