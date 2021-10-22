# Intro
Model simulations are computed directly from platform/arch-node/examples/superposition, by running directly in this directory:
```sh
node superposition.js ./Galapagos-all.def
```

The file `simulations-all_magma_chambers_600_georef.ts` will be generated in the directory where the original file belowgs to.

If you want to merge all grids in one objects with many components, use:
```sh
node merge-objects.js /Users/fmaerten/test/models/arch/galapagos-all/model2/simulations-all_magma_chambers_600_georef.ts
```
The file `simulations-all_magma_chambers_600_georef.ts-merged.ts`will be generated in the same directory.

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
