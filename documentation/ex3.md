In this example, we build a Arche model containing faults, and load
a 3D horizon as grid when the stress field is computed at vertices.
Then, the horizon is flatten in a least squares sens, and the different
in z-coordinate for each vertex will be used as a vertical Gps to
compute the corresponding cost:

```ts
import { loadTsFile, computDispl } from 'otherLib'
import { utils, geophysics as phy } from 'fast-computation'

// Preamble
const horizon = loadTsFile('horizon.ts') // set of 3D points in a flat array
// ... build a Arche model ... then:
const displ = computDispl(model, horizon)

// Get the fitting plane for the horizon
const plane = utils.fittingPlane(horizon)

// and compute the vertical displacements
const size = horizon.length / 3
const vGps = new Array(size).fill(0)
const computed = new Array(size).fill(0)
let j = 0
for (let i = 0; i < horizon.length; i += 3) {
    const p = [horizon[i], horizon[i + 1], horizon[i + 2]]
    vGps[j] = utils.distanceFromPointToPlane(p, plane)
    computed[j++] = displ[2]
}

// and compute the cost
const cost = computedGps.reduce(
    (acc, v, i) => acc + phy.costVerticalGps(vGps[i], v) / size,
)
```
