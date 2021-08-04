// !!! Pas touche les 4 lignes suivantes
const Module = require('@youwol/arch')
const io     = require('@youwol/io')
const df     = require('@youwol/dataframe')
const geo    = require('../../../dist/@youwol/geophysics')
const fs     = require('fs')

const Rsed   = 2900
const Rmag   = 2680
const nu     = 0.25
const E      = 30e9
const theta  = 75
const Rh     = 0.7
const RH     = 0.8
const shift  = -3e7 
const g      = 9.81
const LOS   = [0.01, -0.1, -0.9856]

function printProgress(progress) {
    process.stdout.clearLine()
    process.stdout.cursorTo(0)
    process.stdout.write(progress)
}

Module().then( arch => {
    const model = new arch.Model()
    model.setHalfSpace( true )
    model.setMaterial ( new arch.Material(nu, E, Rsed) )

    // Only one object, so take the first one
    const buffer    = fs.readFileSync('./Fernandina.gcd', 'utf8')
    const df1       = io.decodeGocadTS( buffer )[0]
    const positions = df1.series['positions'].array
    const indices   = df1.series['indices'].array

    const alpha = geo.gradientPressureMapping([theta, Rh, RH, Rsed, Rmag, shift])
    
    const chamber = new arch.Surface(positions, indices)
    chamber.setBC("dip",    "free", 0)
    chamber.setBC("strike", "free", 0)
    chamber.setBC("normal", "free", (x,y,z) => alpha[4]*9.81*Math.abs(z) + alpha[5] )
    model.addSurface( chamber )
   
    const cst = Rsed*g
    const remote = new arch.AndersonianRemote()
    remote.stress = true
    remote.h = (x,y,z) => -Rh*cst*Math.abs(z)
    remote.H = (x,y,z) => -RH*cst*Math.abs(z)
    remote.v = (x,y,z) => -cst*Math.abs(z)
    remote.theta = theta
    model.addRemote( remote )

    const solver = new arch.Solver(model, 'seidel', 1e-9, 200)
    solver.onMessage( c => console.log(c) )
    solver.onEnd( c => console.log('') )
    solver.onProgress( (i, c, context) => {
        if (context===1) {
            printProgress("building system: " + (c+1).toFixed(0) + "%")
        }
        else {
            printProgress("iter " + i + ": residual " + c)
        }
    })
    
    const solution = solver.run()
    solution.onMessage( c => console.log(c) )
    solution.onEnd( c => console.log('') )
    solution.onProgress( (i,p) => printProgress(`nb-pts so far: ${i}, realized: ${p.toFixed(0)}%`))

    // Obs grid at exactly dikes points
    const dataframe = io.decodeXYZ( fs.readFileSync('./dykes.xyz', 'utf8') )[0]
    const U         = df.Serie.create({array: solution.displ( dataframe.series['positions'].array ), itemSize: 3})

    const newDf = df.DataFrame.create({
        series: {
            positions: dataframe.series['positions'],
            U        : U,
            insar    : geo.generateInsar(U, LOS)
        }
    })

    // Save the insar data (pos, displ and insar)
    const bufferOut = io.encodeXYZ(newDf)
    fs.writeFile('insar.xyz', bufferOut, 'utf8', err => {})
})
