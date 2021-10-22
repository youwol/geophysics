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

    // Only one object, so take the first one
    const surfaces    = fs.readFileSync('/Users/fmaerten/test/models/arch/galapagos-all/model2/all_magma_chambers_600_georef.ts', 'utf8')
    // const df1       = io.decodeGocadTS( buffer )[0]
    // positions = df1.series['positions'].array
    // indices   = df1.series['indices'].array
    
    surfaces.forEach( surface => {
        const chamber = new arch.Surface(surface.series.positions.array, surface.series.indices.array)
        chamber.setBC("dip",    "free", 0)
        chamber.setBC("strike", "free", 0)
        chamber.setBC("normal", "free", 0)
        model.addSurface( chamber )
    })
    
    console.log('Nbr DOFS:', model.nbDof())
   
    const remote = new arch.UserRemote()
    model.addRemote( remote )

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
