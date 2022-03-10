const io   = require('@youwol/io')
const df   = require('@youwol/dataframe')
const math = require('@youwol/math')
const fs   = require('fs')

function info(name, a) {
    console.log(name)
    console.log('length x', a[3]-a[0])
    console.log('length y', a[4]-a[1])
    console.log('length z', a[5]-a[2])
    console.log('center', (a[3]+a[0])/2, (a[4]+a[1])/2, (a[5]+a[2])/2)
    console.log('top', a[5])
    console.log('')
}

function scale(a, x, y, z) {
    return [a[0]*x, a[1]*y, a[2]*z, a[3]*x, a[4]*y, a[5]*z]
}

function translate(a, x, y, z) {
    return [a[0]+x, a[1]+y, a[2]+z, a[3]+x, a[4]+y, a[5]+z]
}

let c = [659882, 9956678, -9159, 665430, 9961925, -0.3]
const f = [  -902,   -1827, -2367,   1456,    1814, -658]

c = translate(c, -662656, -9959301.5, 4579.65-1000)
c = scale(c, .3, .3, .3)
// c = translate(c, 0, 0, 0)

info('chamber', c)
info('fault', f)

if (1) {
    const dataframe = io.decodeGocadTS( fs.readFileSync('/Users/fmaerten/data/arch/figure-superposition/chamber.ts', 'utf8') )[0]
    let positions = dataframe.series.positions

    positions = positions.map( p => [p[0]-662656, p[1]-9959301.5, p[2]+4579.65-1500] )
    positions = math.scale(positions, .3)
    positions = positions.map( p => [p[0]-2000, p[1], p[2]-1200] )
    dataframe.series.positions = positions

    const bufferOut = io.encodeGocadTS(dataframe)
    fs.writeFile('/Users/fmaerten/data/arch/figure-superposition/chamber-modif.ts', bufferOut, 'utf8', err => {})
}
