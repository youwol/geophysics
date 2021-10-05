// !!! Pas touche les 4 lignes suivantes
const Module = require('@youwol/arch')
const io     = require('@youwol/io')
const df     = require('@youwol/dataframe')
const geop   = require('../../dist/@youwol/geophysics')
const fs     = require('fs')

let {positions, indices, grid, printProgress} = require('./utils')
let params = require('./user-params')


Module().then( arch => {
    const model = new arch.Model()
    model.setMaterial ( new arch.Material(params.nu, params.E, params.rockDensity) )
    model.setHalfSpace( false )
    
    const chamber = new arch.Surface(positions.array, indices.array)
    chamber.setBC("dip",    "free", 0)
    chamber.setBC("strike", "free", 0)
    chamber.setBC("normal", "free", (x,y,z) => params.shift + params.cavityDensity*params.g*Math.abs(z) )
    model.addSurface( chamber )
   
    const remote = new arch.UserRemote()
    remote.func = (x,y,z) => {
        if (params.remote === true) {
            const alpha = geop.gradientPressureMapping([
                params.theta, params.Rh, params.RH,
                params.rockDensity, params.cavityDensity, params.shift
            ])
            return [
                alpha[0]*Math.abs(z), 
                alpha[1]*Math.abs(z), 
                0, 
                alpha[2]*Math.abs(z), 
                0, 
                alpha[3]*Math.abs(z)
            ]
        }
        return [0,0,0,0,0,0]
    }
    model.addRemote( remote )

    //console.log( model.tractions() )

    const solver = new arch.Solver(model, 'seidel', params.tol, params.maxIter)
    solver.onMessage( c => console.log(c) )
    solver.onEnd( c => console.log('') )
    solver.onProgress( (i, c, context) => {
        context === 1 ? printProgress("building system: " + (c+1).toFixed(0) + "%") : printProgress("iter " + i + ": residual " + c.toFixed(7))
        
    })

    const solution = solver.run()
    solution.onMessage( c => console.log(c) )
    solution.onEnd( c => console.log('') )
    solution.onProgress( (i,p) => printProgress(`nb-pts so far: ${i}, realized: ${p.toFixed(0)}%`))

    const obs = grid.series['positions'].array
    //grid.series['stress']  = df.Serie.create({array: solution.stress(obs), itemSize: 6})
    grid.series['displ']   = df.Serie.create({array: solution.displ (obs), itemSize: 3})
    
    const insar = geop.generateInsar(grid.series['displ'], params.LOS)
    grid.series['insar']   = insar
    grid.series['fringes'] = geop.generateFringes(insar, params.fringe)

    fs.writeFile('insar.gcd', io.encodeGocadTS(grid), 'utf8', err => {})

    // ----------------------------------------------------------------------

    const surface = df.DataFrame.create({
        series:{
            positions,
            indices
        }
    })
    fs.writeFile('surface.gcd', io.encodeGocadTS(surface), 'utf8', err => {})

})
