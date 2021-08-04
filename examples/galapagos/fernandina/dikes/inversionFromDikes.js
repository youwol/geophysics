/**
 * Inverst for the far field stress + 1 pressure in the Fernandina
 * magma chamber
 */
const io     = require('@youwol/io')
const df     = require('@youwol/dataframe')
const math   = require('@youwol/math')
const geo    = require('../../../dist/@youwol/geophysics')
const fs     = require('fs')

const Rmag   = 2680 // Sediment density (kg/m3)
const Rsed   = 2900 // Sediment density (kg/m3)
const nu     = 0.25 // Sediment Poisson's ratio
const E      = 30e9  // Sediment Young's modulus (Pa)

function printProgress(progress){
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(progress);
}

// -----------------------------------------------------------------

const buffer    = fs.readFileSync('./simulations.xyz', 'utf8')
const dataframe = io.decodeXYZ( buffer )[0]

const dikes = new geo.StyloliteData({
    dataframe,
    measure: 'n',
    compute: new Array(6).fill(0).map( (v,i) => `stress${i+1}` )
})

const result = geo.monteCarlo({
    data: [dikes],
    alpha: {
        // [theta, Rh, RH, rockDensity, cavityDensity, shift]
        mapping: geo.gradientPressureMapping,
        // min: [0,   0, 0, Rsed, 1500, -1e9],
        // max: [180, 5, 5, Rsed, 3000,  1e9]
        min: [0,   0, 0, Rsed, Rmag, -1e9],
        max: [180, 5, 5, Rsed, Rmag,  1e9]
    },
    onProgress: (i,v) => printProgress(i+": "+v+"%"),
    onMessage: msg => console.log(msg)
}, 2000)

/*
As an example, from https://physpet.ess.washington.edu/wp-content/uploads/sites/13/2016/02/Galapagoes-magma-chambers.pdf
we have an estimate of the Fernandina magma density, page 62: 2680 kg/m3
*/


console.log('inversion result:', result )
//console.log('measured ', dataframe.series['insar'].array )
//console.log('recovered', insar.generate(result.alpha).array)
