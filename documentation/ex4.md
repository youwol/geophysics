```ts
import { dataframe as df, superposition as su } from 'fast-computation'
import { geology as geol, geophysics as phy } from 'fast-computation'
import { utils, mapping } from 'fast-computation'

// Create a dataframe of 10000 points in order to store the
// computed attributes
const dataframe = df.create(10000)

// The 3 linearly independent constraints to apply to the model
// in order to compute stress and displacement fields at the points
const constraints = [
    [1,0,0,0,0,0],
    [0,0,0,1,0,0],
    [0,0,0,0,0,1]
]

// For each linearly independent simulation (i.e., 3), compute the stress
// and displacement at the 10000 points, and add them in the dataframe
for (let i=0; i<3; ++i) {
    performSimulation( constraints[i] )
    df.add(dataframe, 0, computedDispl() )
    df.add(dataframe, 1, computedStress())
}

let solution = {
    cost : 1e10,
    theta: 0,
    R    : 0
}

// Perform a brut Monte Carlo simulation using 50000 iteration
for (let i=0; i<50000; ++i) {
    const theta = Math.random()*180
    const R     = Math.random()*3

    // attrs[0] is displ, attr[1] is stress
    const attrs = su.combine( dataframe, mapping.SimpleAndersonMapping(theta, R) )
    const cost = (
        phy.generateInsar(attrs[0], [0.01, -0.1, -0.9856])
            .reduce( (acc, v, i) => acc + phy.costInsar(insars[i], v, 3) / insars.length )
        +
        utils.chuncks(attrs[1], 6)
            .reduce( (acc, s, i) => acc + geol.costDike(dikes[i], s, 1) / dikes.length / 3 )
    ) / 2
    if (cost < solution.cost) solution = {cost, theta, R}
}
```