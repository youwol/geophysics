# Setting up the libraries
- Put the latest `arch.js` library in `geophysics/node_modules/@youwol/`

# Model setup
Run the script
```sh
node simulations.js
```
to compute the 6 independent silulations, so that the superposition will be possible. The file `simulations.xyz` will be generated with the stress and displacement fields in it.

# Stress and pressure inversion using dike orientations
Run the script
```sh
node inversionFormDikes.js
```
to invert for the far field stress and the pressure inside the magma chamber.

# Generate the synthic dikes
Get the inverted parameters and edit the script `post-process-dikes.js`.

Then, run the script
```sh
node post-process-dikes.js
```
to generate the synthetic dikes from the simulation

# Synthetic test
Stress and pressure inversion using **InSAR** data.

To do that, we are going to generate a synthetic insar using a given far field stress and pressure shift.

Then, the stress and pressure inversion is performed.