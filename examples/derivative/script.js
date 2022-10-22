const io     = require('@youwol/io')
const df     = require('@youwol/dataframe')
const math   = require('@youwol/math')
const fs     = require('fs')

function derivative(data, positions) {
    const n     = data.count
    let prevDat = data.itemAt(0)
    let prevPos = positions.itemAt(0)

    const newData = data.clone(false)

    for (let i=1; i<n-1; ++i) {
        const nexDat = data.itemAt(i+1)
        const nexPos = positions.itemAt(i+1)
        const a = (nexDat-prevDat)/(nexPos-prevPos)
        newData.setItemAt(i, a)
        prevDat = data.itemAt(i)
        prevPos = positions.itemAt(i)
    }

    newData.setItemAt(0, newData.itemAt(1))
    newData.setItemAt(n-1, newData.itemAt(n-2))

    return newData
}

// -----------------------------------------------------------------

const file = '/Users/fmaerten/data/arch/Sanz/data_disconnected.xyz'

// -----------------------------------------------------------------

const dataframe = io.decodeXYZ( fs.readFileSync(file, 'utf8') )[0]
const positions = dataframe.series.positions.map( p => p[0] )
const data      = dataframe.series.Szz_norm
const der       = derivative(data, positions)

der.forEach( v => console.log(v.toString().replace('.', ',')) )
