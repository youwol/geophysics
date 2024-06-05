/**
Using 8 pre-computed models to generate a new one

```ts
const io = require('@youwol/io')
const geo = require('@youwol/geophysics')
const fs = require('fs')

const dataframe = io.decodeGocadTS(
    fs.readFileSync(
        'data/simulations.ts',
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
    'data/superposition.ts',
    bufferOut,
    'utf8',
    (err) => {},
)
```
*/
export namespace Example_1 {}
