// !!! Pas touche les 4 lignes suivantes
const Module = require('@youwol/arch')
const io = require('@youwol/io')
const df = require('@youwol/dataframe')
const math = require('@youwol/math')
const geop = require('../../dist/@youwol/geophysics')
const fs = require('fs')

let { positions, indices, grid, printProgress } = require('./utils')
let params = require('./user-params')

Module().then((arch) => {
    const model = new arch.Model()
    model.setMaterial(
        new arch.Material(params.nu, params.E, params.rockDensity),
    )
    model.setHalfSpace(params.halspace)

    const chamber = new arch.Surface(positions.array, indices.array)
    chamber.setBC('dip', 'free', 0)
    chamber.setBC('strike', 'free', 0)
    chamber.setBC(
        'normal',
        'free',
        (x, y, z) =>
            params.shift + params.cavityDensity * params.g * Math.abs(z),
    )
    model.addSurface(chamber)

    const remote = new arch.UserRemote()
    remote.func = (x, y, z) => {
        if (params.remote === true) {
            const alpha = geop.gradientPressureMapping([
                params.theta,
                params.Rh,
                params.RH,
                params.rockDensity,
                params.cavityDensity,
                params.shift,
            ])
            return [
                alpha[0] * Math.abs(z),
                alpha[1] * Math.abs(z),
                0,
                alpha[2] * Math.abs(z),
                0,
                alpha[3] * Math.abs(z),
            ]
        }

        const alpha = [0, 0, 0, 0, 0, 0]
        console.log('alpha', alpha)
        return alpha
    }
    model.addRemote(remote)

    const solver = new arch.Solver(model, 'seidel', params.tol, params.maxIter)
    const solution = solver.run()

    const obs = grid.series['positions'].array
    const stress = df.Serie.create({ array: solution.stress(obs), itemSize: 6 })

    grid.series['gps'] = df.Serie.create({
        array: solution.displ(obs),
        itemSize: 3,
    })
    grid.series['insar'] = geop.generateInsar({
        displ: grid.series['gps'],
        LOS: params.LOS,
    })
    grid.series['dikes'] = geop.generateDikes({ stress, projected: true })
    grid.series['shears'] = geop.generateConjugates({
        stress,
        friction: 30,
        projected: true,
    })
    const shears = geop.generateConjugates({
        stress,
        friction: 30,
        projected: false,
    })
    grid.series['shears1'] = shears.n1
    grid.series['shears2'] = shears.n2

    fs.writeFile('data.gcd', io.encodeGocadTS(grid), 'utf8', (err) => {})

    // ----------------------------------------------------------------------

    const surface = df.DataFrame.create({
        series: {
            positions,
            indices,
        },
    })
    fs.writeFile('surface.gcd', io.encodeGocadTS(surface), 'utf8', (err) => {})
    console.log('All done...')
})
