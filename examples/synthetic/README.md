# Setting up the libraries

-   Put the latest `arch.js` library in `geophysics/node_modules/@youwol/`

# Model setup

Run the script

```sh
node simulations.js
```

to compute the 6 independent simulations, so that the superposition will be possible. The file `simulations.gcd` will be generated with the stress and displacement fields in it.
<br><br>

---

---

# User parameters

Set the user parameters at your convenience in the file `user-params.js`. Then do the following.

## 1) Generate the synthetic insar

Generate the synthetic insar from the script

```sh
node forward.js
```

# 2) Stress and pressure inversion using the insar

Run the script

```sh
node inversionFormInsar.js
```

to invert for the far field stress and the pressure inside the magma chamber. You should find a cost close to zero (`~1e-10`) and the generated inverted insar should match the one used for the inversion.
