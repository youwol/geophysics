Performs a monte-carlo simulation using generated insar data

```ts
import { dataframe }     from '../lib/dataframe'
import { geophysics }    from '../lib/geophysics'
import { inversion }     from '../lib/inversion'
import { superposition } from '../lib/superposition'

// Computed displacement fields for the 3 linearly independent simulations
// and for the 5 points (hense, 5 displacement vectors per field)
const displField1 = [1,2,3,   4,5,8,  5,6,3,   9,9,1,   3,2,4  ]
const displField2 = [7,7,8,   11,9,4, 10,6,11, 13,27,7, 9,7,5  ]
const displField3 = [1,12,13, 5,8,10, 10,6,7,  5,9,17,  9,14,20]

// The satellite line of sight
const lineOfSight: Vec3 = [0.01, -0.2, -0.95]

// DataFrame for the 3 numerical simulations
// One dataset (insar), hense one index (0)
const calculus    = dataframe.create(5) // The 5 points
dataframe.add(calculus, 0, geophysics.generateInsar(displField1, lineOfSight)  )
dataframe.add(calculus, 0, geophysics.generateInsar(displField2, lineOfSight)  )
dataframe.add(calculus, 0, geophysics.generateInsar(displField3, lineOfSight)  )



// DataFrame for the measured insar data
const measure = dataframe.create(5)
const insar = [-8.732, 45.8457, 22.518, -20.6505, -25.394]
dataframe.add(measure, 0, insar)

const invParams = {
    n: 100000,
    alphaParameters: { 
        dim: 3,
        mapping: undefined,
        min: [-10, -5,  0],
        max: [ -7,  0, 10]
    },
    calculus,
    measure,
    weights: [1],
    costFunctions: [geophysics.costInsar]
}

const result   = inversion.monteCarlo(invParams)
const solution = superposition.combine(calculus, result.alpha)[0]

console.log('measured', insar )
console.log('inverted', solution )
```

Should display something close to:
```
measured [
    -8.732,
    45.8457,
    22.518,
    -20.6505,
    -25.394
]
inverted [
    -8.789592952291386,
    44.75131545301997,
    22.200420479780135,
    -20.489724014858503,
    -25.48046434315706
]
```
