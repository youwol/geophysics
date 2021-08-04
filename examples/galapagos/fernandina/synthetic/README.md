# Setting up the libraries
- Put the latest `arch.js` library in `geophysics/node_modules/@youwol/`

# Model setup
Run the script
```sh
node simulations.js
```
to compute the 6 independent silulations, so that the superposition will be possible. The file `simulations.gcd` will be generated with the stress and displacement fields in it.

# Generate the synthic insar
Generate the synthetic insar from the script
```sh
node generate-insar.js
```


# Stress and pressure inversion using insar
Run the script
```sh
node inversionFormInsar.js
```
to invert for the far field stress and the pressure inside the magma chamber.
