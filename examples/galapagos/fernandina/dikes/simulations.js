// !!! Pas touche les 4 lignes suivantes
const Module = require('@youwol/arch')
const io     = require('@youwol/io')
const df     = require('@youwol/dataframe')
const geo    = require('../../../dist/@youwol/geophysics')
const fs     = require('fs')

const Rsed   = 2900 // Sediment density (kg/m3)
const nu     = 0.25 // Sediment Poisson's ratio
const E      = 30e9  // Sediment Young's modulus (Pa)

function printProgress(progress) {
    process.stdout.clearLine()
    process.stdout.cursorTo(0)
    process.stdout.write(progress)
}

Module().then( arch => {
    const model = new arch.Model()
    model.setHalfSpace( true )
    model.setMaterial ( new arch.Material(nu, E, Rsed) )

    let positions, indices

    const TEST = true

    if (TEST === false) {
        // Only one object, so take the first one
        const buffer    = fs.readFileSync('./Fernandina.gcd', 'utf8')
        const df1       = io.decodeGocadTS( buffer )[0]
        positions = df1.series['positions'].array
        indices   = df1.series['indices'].array
    }
    else {
        // FOR TESTING quickly...
        positions  = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, -0.5877852439880371, 0.80901700258255, 0, -3.599146555896214e-17, 0.80901700258255, 0.5877852439880371, 0.5877852439880371, 0.80901700258255, 7.198293111792428e-17, 1.0797439998560886e-16, 0.80901700258255, -0.5877852439880371, -0.5877852439880371, 0.80901700258255, -1.4396586223584855e-16, -0.9510565400123596, 0.30901700258255005, 0, -5.823541433041957e-17, 0.30901700258255005, 0.9510565400123596, 0.9510565400123596, 0.30901700258255005, 1.1647082866083914e-16, 1.747062496087036e-16, 0.30901700258255005, -0.9510565400123596, -0.9510565400123596, 0.30901700258255005, -2.329416573216783e-16, -0.9510565400123596, -0.30901700258255005, 0, -5.823541433041957e-17, -0.30901700258255005, 0.9510565400123596, 0.9510565400123596, -0.30901700258255005, 1.1647082866083914e-16, 1.747062496087036e-16, -0.30901700258255005, -0.9510565400123596, -0.9510565400123596, -0.30901700258255005, -2.329416573216783e-16, -0.5877852439880371, -0.80901700258255, 0, -3.599146555896214e-17, -0.80901700258255, 0.5877852439880371, 0.5877852439880371, -0.80901700258255, 7.198293111792428e-17, 1.0797439998560886e-16, -0.80901700258255, -0.5877852439880371, -0.5877852439880371, -0.80901700258255, -1.4396586223584855e-16, -1.2246468525851679e-16, -1, 0, -7.498798786105971e-33, -1, 1.2246468525851679e-16, 1.2246468525851679e-16, -1, 1.4997597572211942e-32, 2.2496396358317913e-32, -1, -1.2246468525851679e-16, -1.2246468525851679e-16, -1, -2.9995195144423884e-32]
        indices    = [0, 5, 6, 1, 6, 7, 2, 7, 8, 3, 8, 9, 6, 5, 11, 5, 10, 11, 7, 6, 12, 6, 11, 12, 8, 7, 13, 7, 12, 13, 9, 8, 14, 8, 13, 14, 11, 10, 16, 10, 15, 16, 12, 11, 17, 11, 16, 17, 13, 12, 18, 12, 17, 18, 14, 13, 19, 13, 18, 19, 16, 15, 21, 15, 20, 21, 17, 16, 22, 16, 21, 22, 18, 17, 23, 17, 22, 23, 19, 18, 24, 18, 23, 24, 21, 20, 26, 22, 21, 27, 23, 22, 28, 24, 23, 29]
    }
    
    const chamber = new arch.Surface(positions, indices)
    chamber.setBC("dip",    "free", 0)
    chamber.setBC("strike", "free", 0)
    chamber.setBC("normal", "free", 0)
    model.addSurface( chamber )
    console.log('Nbr DOFS:', model.nbDof())
   
    const remote = new arch.UserRemote()
    model.addRemote( remote )

    let memDone = false
    const solver = new arch.Solver(model, 'seidel', 1e-9, 200)
    solver.onMessage( c => console.log(c) )
    solver.onEnd( c => console.log('') )
    solver.onProgress( (i, c, context) => {
        if (context===1) {
            printProgress("building system: " + (c+1).toFixed(0) + "%")
            //console.log("building system:", c.toFixed(0)+"%")
        }
        else {
            printProgress("iter " + i + ": residual " + c)
            //console.log("iter ",i,": residual", c)
        }
    })
    solver.setAutoReleaseMemory(false)

    const nbSimulations = 6

    // Obs grid
    let dataframe = io.decodeXYZ( fs.readFileSync('./dykes.xyz', 'utf8') )[0]
    const obs     = dataframe.series['positions'].array

    const doSimulation = index => {
        const alpha = new Array(nbSimulations).fill(0).map( (v,i) => i===(index-1)?1:0 )
        console.log('Doing simulation',alpha,"at index",index)

        remote.func = (x,y,z) => [alpha[0], alpha[1], 0, alpha[2], 0, alpha[3]]
        chamber.setBC("normal", "free", (x,y,z) => alpha[4]*9.81*Math.abs(z) + alpha[5] )

        const solution = solver.run()
        solution.onMessage( c => console.log(c) )
        solution.onEnd( c => console.log('') )
        solution.onProgress( (i,p) => printProgress(`nb-pts so far: ${i}, realized: ${p.toFixed(0)}%`))

        // Compute the stress and displ and put everything in a dataframe
        dataframe.series[`stress${index}`] = df.Serie.create({array: solution.stress(obs), itemSize: 6})
        dataframe.series[`displ${index}`]  = df.Serie.create({array: solution.displ (obs), itemSize: 3})
    }

    for (let i=1; i<=nbSimulations; ++i) doSimulation(i)

    console.log(dataframe)

    // Save the line obs
    if (TEST === false) {
        const bufferOut = io.encodeXYZ(dataframe)
        fs.writeFile('simulations.xyz', bufferOut, 'utf8', err => {})
    }
})
