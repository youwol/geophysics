Name of the Galapagos are [here](https://news.stanford.edu/news/2000/january12/galapagos-112.html)

- 6 ou 12 simulations are done in `platform/components/arch-node/examples/superposition` by launching
```sh
node simulations.js Galapagos.def
```
- inversion is done here using
```sh
node inversion.js
```

# Some results

## One pressure
```js
result = {
    "user" : [
        50, 
        0.4836,
        0.4844, 
        2000, 
        2600, 
        1.5e7
    ],
    "cost" : 0.16,
    "fit"  : 84
}
```

## Multiple pressure
```js
result = {
    17,
    0.50,
    0.51,
    2000,
    2600,
    8.00e7,
    0.35e7,
    1.35e7,
    1.97e7,
    5.74e7,
    7.25e7,
    1.56e7
}
```