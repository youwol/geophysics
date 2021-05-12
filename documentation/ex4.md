```ts
import * as math from '@youwol/math'
import { createSerie, DataFrame, dot, weightedSum } from '@youwol/dataframe'
import { monteCarlo, InsarData } from '../lib'

// Computations
const displField1 = [1,2,3,   4,5,8,  5,6,3,   9,9,1,   3,2,4  ]
const displField2 = [7,7,8,   11,9,4, 10,6,11, 13,27,7, 9,7,5  ]
const displField3 = [1,12,13, 5,8,10, 10,6,7,  5,9,17,  9,14,20]

// Measurements
const insarMeasurements = [-8.732, 45.8457, 22.518, -20.6505, -25.394]

let dataframe = new DataFrame({
    'U1'   : createSerie({data: displField1, itemSize: 3}),
    'U2'   : createSerie({data: displField2, itemSize: 3}),
    'U3'   : createSerie({data: displField3, itemSize: 3}),
    'insar': createSerie({data: insarMeasurements})
})

// The insar dataset
const los = [0.01, -0.2, -0.95] // sat line of sight
const insar = new InsarData({
    dataframe,
    los,
    measure: 'insar',
    compute: ['U1', 'U2', 'U3']
})

// The stochastic inversion
const result = monteCarlo({
    data: [insar],
    alpha: {
        mapping: undefined,
        min: [-10, -5,  0],
        max: [ -7,  0, 10]
    }
}, 100000)

// Display the result
console.log('inversion result:', result )

// Compare the measurements with the recovered insar
// from the best solution
const recoveredInsar = insar.generate(result.alpha).array)

console.log('measured ', dataframe.get('insar').array )
console.log('recovered', recoveredInsar.array)
```

Should display

```js
inversion result: {
    alpha: [ -8.640479569761252, -1.0189215710991784, 3.0912827744896254 ],
    user:  [ -8.640479569761252, -1.0189215710991784, 3.0912827744896254 ],
    cost: 0.0002217,
    fit: 99.98
}
recovered [ -8.471, 45.398, 22.373, -20.205, -24.906 ]
measured  [ -8.732, 45.846, 22.518, -20.650, -25.394 ]
```