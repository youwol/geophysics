Basically, you will have to use only 3 functions from this library: [[create]], [[add]] and [[superposition]].

In this example, we will use 3 linearly independant simulations. For each simulation, we compute one stress field and one displacement field. We assume that you have a numerical code (can be `Arche` from [YouWol](youwol.com)) that implement the 2 functions `computedDispl()` and `computedStress()`.

```ts
import { dataframe as df, superposition as su } from 'fast-computation'

// Create a dataframe of 10000 points in order to store the
// computed attributes
const dataframe = df.create(10000)

// For each linearly independent simulation (i.e., 3), compute the
// stress and displacement, and add them in the dataframe
for (let i = 0; i < 3; ++i) {
    df.add(dataframe, 0, computedDispl())
    df.add(dataframe, 1, computedStress())
}

// Display some info about the dataframe
console.log(df.info(dataframe))

// Now, use the superposition as often as needed
const attrs = su.combine(dataframe, [1, 2, 3])

const displs = attrs[0] // displacements field at the 10000 points as a flat array
const stresses = attrs[1] // stress field at the 10000 points as a flat array
```

The created `attr` variable contains the `displ` and `stress` attributes for all points as flat arrays.
That is to say, `attr[0]` is an array of size `10000*3`, and `attr[1]` is an array of size `10000*6`
