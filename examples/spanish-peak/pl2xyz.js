const fs = require('fs')
const io = require('@youwol/io')
const df = require('@youwol/dataframe')
const math = require('@youwol/math')
const { exit } = require('process')

if (process.argv.length < 5) {
    console.log(`
    -------------------------------------
    Convert a Gocad PLine into a xyz file
    with normal information at each point
    -------------------------------------
    
    Usages:
        node pl2xyz.js inputfile.pl outputfile.xyz [weight=1] [dipAngle=90]
        node pl2xyz.js

    Notes:
        A dipAngle of 90 means a vertical fracture
    `)
    exit(1)
}

const outFile = process.argv[3]

let weight = 1
if (process.argv.length > 4) {
    weight = parseFloat(process.argv[4])
}
console.log('using data weight', weight)

let dipAngle = 90
if (process.argv.length > 5) {
    dipAngle = parseFloat(process.argv[5])
}
console.log('using dip-angle', dipAngle)

var dip = (dipAngle * Math.PI) / 180
var COS = Math.cos(dip)
var SIN = Math.sin(dip)

const dataframes = io.decodeGocadPL(fs.readFileSync(process.argv[2], 'utf8'))

let bufferOut = '# x y z nx ny nz w\n'

dataframes.forEach((dataframe) => {
    const positions = dataframe.series.positions
    dataframe.series.indices.forEach((seg) => {
        const p1 = positions.itemAt(seg[0])
        const p2 = positions.itemAt(seg[1])
        const p = [0, 0, 0]
        for (var i = 0; i < 3; ++i) {
            p[i] = (p1[i] + p2[i]) / 2
        }

        let n = math.vec.normalize([
            (p2[1] - p1[1]) * SIN,
            -(p2[0] - p1[0]) * SIN,
            p[2] * COS,
        ])

        bufferOut +=
            p[0] +
            ' ' +
            p[1] +
            ' ' +
            p[2] +
            ' ' +
            n[0] +
            ' ' +
            n[1] +
            ' ' +
            n[2] +
            ' ' +
            weight +
            '\n'
    })
})

fs.writeFileSync(outFile, bufferOut, 'utf8')
