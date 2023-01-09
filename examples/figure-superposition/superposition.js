/**
 * Invert for the far field stress + 1 pressure ina cavity
 */
const io = require('@youwol/io')
const geo = require('../../dist/@youwol/geophysics')
const fs = require('fs')

const dataframe = io.decodeGocadTS(
    fs.readFileSync(
        '/Users/fmaerten/data/arch/figure-superposition/simulations.ts',
        'utf8',
    ),
)[0]

console.log(dataframe.series.positions.count)

//             xx   xy   xz   yy    yz   zz   rho pe
const alpha = [72, 2, 11, 110, 100, 1, 5, 3]
console.log('alpha', alpha)

dataframe.series['U'] = geo.forward.attribute({
    simulations: dataframe,
    name: 'U',
    alpha,
    startIndex: 1,
})

const bufferOut = io.encodeGocadTS(dataframe)
fs.writeFile(
    '/Users/fmaerten/data/arch/figure-superposition/superposition.ts',
    bufferOut,
    'utf8',
    (err) => {},
)

// const result = geo.monteCarlo({
//     data: [dikes],
//     alpha: {
//         // [theta, Rh, RH, rockDensity, cavityDensity, shift]
//         mapping: geo.gradientPressureMapping,
//         // min: [0,   0, 0, Rsed, 1500, -1e9],
//         // max: [180, 5, 5, Rsed, 3000,  1e9]
//         min: [0,   params.RsMin, params.RvMin, params.rockDensity, params.cavityDensity, params.shiftMin],
//         max: [180, params.RsMax, params.RvMax, params.rockDensity, params.cavityDensity, params.shiftMax]
//     },
//     onProgress: (i,v) => printProgress(i+": "+v+"%"),
//     onMessage: msg => console.log(msg)
// }, params.nbSimuls)

// /*
// As an example, from https://physpet.ess.washington.edu/wp-content/uploads/sites/13/2016/02/Galapagoes-magma-chambers.pdf
// we have an estimate of the Fernandina magma density, page 62: 2680 kg/m3
// */

// console.log('inversion result:', result )
// const alpha = result.alpha

// dataframe2.series['cost']   = dikes.costs(alpha)

// const stress = geo.forward.attribute({
//     simulations: dataframe,
//     name: 'stress',
//     alpha
// })

// dataframe2.series['iDikes']  = geo.generateDikes({stress, projected: true})

// // Translate for the visu
// dataframe2.series['positions'] = df.apply(dataframe2.series['positions'], item => [item[0]+2, item[1], item[2]] )

// const bufferOut = io.encodeGocadTS(dataframe2)
// fs.writeFile('result-dikes.gcd', bufferOut, 'utf8', err => {})
