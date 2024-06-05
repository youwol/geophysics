/**
 * Perform an inversion using only dike orientations
```js
// --------------------------------------------------------
// Invert for the far field stress + 1 pressure in a cavity
// Arch is not needed ;-)
// --------------------------------------------------------

const io = require('@youwol/io')
const df = require('@youwol/dataframe')
const geo = require('@youwol/geophysics')
const fs = require('fs')
let params = require('./user-params')

function printProgress(progress) {
    process.stdout.clearLine()
    process.stdout.cursorTo(0)
    process.stdout.write(progress)
}

const dataframe  = io.decodeGocadTS(fs.readFileSync('./simulations.gcd', 'utf8'))[0] // first loaded dataframe only
dataframe.series['dikes'] = dataframe2.series['dikes']

const dataframe2 = io.decodeGocadTS(fs.readFileSync('./data.gcd', 'utf8'))[0] // first loaded dataframe only
dataframe2.remove('dikes')

const dikes = new geo.DikeData({
    dataframe,
    measure: 'dikes',
    useNormals: false,
    compute: new Array(6).fill(0).map((v, i) => `stress${i + 1}`),
})

const result = geo.monteCarlo(
    {
        data: [dikes],
        alpha: {
            // [theta, Rh, RH, rockDensity, cavityDensity, shift]
            mapping: geo.gradientPressureMapping,
            // min: [0,   0, 0, Rsed, 1500, -1e9],
            // max: [180, 5, 5, Rsed, 3000,  1e9]
            min: [
                0,
                params.RsMin,
                params.RvMin,
                params.rockDensity,
                params.cavityDensity,
                params.shiftMin,
            ],
            max: [
                180,
                params.RsMax,
                params.RvMax,
                params.rockDensity,
                params.cavityDensity,
                params.shiftMax,
            ],
        },
        onProgress: (i, v) => printProgress(i + ': ' + v + '%'),
        onMessage: (msg) => console.log(msg),
    },
    params.nbSimuls,
)

// As an example, from https://physpet.ess.washington.edu/wp-content/uploads/sites/13/2016/02/Galapagoes-magma-chambers.pdf
// we have an estimate of the Fernandina magma density, page 62: 2680 kg/m3

console.log('inversion result:', result)
const alpha = result.alpha

dataframe2.series['cost'] = dikes.costs(alpha)

const stress = geo.forward.attribute({
    simulations: dataframe,
    name: 'stress',
    alpha,
})

dataframe2.series['iDikes'] = geo.generateDikes({ stress, projected: true })

// Translate for the visu in order to compare visually
dataframe2.series['positions'] = df.apply(
    dataframe2.series['positions'],
    (item) => [item[0] + 2, item[1], item[2]],
)

const bufferOut = io.encodeGocadTS(dataframe2)
fs.writeFile('result-dikes.gcd', bufferOut, 'utf8', (err) => {})
```

with `user-params.js` being:
```js
module.exports = {
    // CONSTANTS + MATERIAL
    g: 9.81,
    nu: 0.25,
    E: 20,
    halspace: true,

    // REMOTE
    remote: true,
    theta: 22,
    Rh: 0.1,
    RH: 1.3,
    rockDensity: 3,

    // CAVITY
    cavityDensity: 2,
    shift: 5,

    // INSAR
    LOS: [0.1, -0.5, -0.8],
    fringe: 0.2,
    nx: 50,
    ny: 50,

    // SOLVER
    tol: 1e-9,
    maxIter: 200,

    // INVERSION
    shiftMin: -100,
    shiftMax: 100,
    RsMin: 0,
    RsMax: 3,
    RvMin: 0,
    RvMax: 10,
    nbSimuls: 1000,
}
```
*/
export namespace Example_2 {}
