/**
 * Inverst for the far field stress + 1 pressure in the Fernandina
 * magma chamber
 */
const io     = require('@youwol/io')
const df     = require('@youwol/dataframe')
const geom   = require('@youwol/geometry')
const math   = require('@youwol/math')
const geo    = require('../../../dist/@youwol/geophysics')
const fs     = require('fs')

const Rmag   = 2680 // Sediment density (kg/m3)
const Rsed   = 2900 // Sediment density (kg/m3)
const LOS    = [0.01, -0.1, -0.9856]

function printProgress(progress){
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(progress);
}

// -----------------------------------------------------------------

const dataframe = io.decodeXYZ( fs.readFileSync('./simulations.xyz', 'utf8') )[0]
const dataframe2 = io.decodeXYZ( fs.readFileSync('./insar.xyz', 'utf8') )[0]
dataframe.series['insar'] = dataframe2.series['insar']

const insar = new geo.InsarData({
    dataframe,
    los: LOS,
    normalize: true,
    measure: 'insar',
    compute: new Array(6).fill(0).map( (v,i) => `displ${i+1}` )
})

const result = geo.monteCarlo({
    data: [insar],
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
}, 100000)

/*
As an example, from https://physpet.ess.washington.edu/wp-content/uploads/sites/13/2016/02/Galapagoes-magma-chambers.pdf
we have an estimate of the Fernandina magma density, page 62: 2680 kg/m3
*/


console.log('inversion result:', result )
//console.log('measured ', dataframe.series['insar'].array )
//console.log('recovered', insar.generate(result.alpha).array)