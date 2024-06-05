This example uses functions [[generateInsar]], [[costInsar]], [[chuncks]] and [[costJoint]].

Given the displacement field `displs` from the previous example, as well as the `insars` from measurements (observation), compute the corresponding cost for Insar.
Note that the size of `displs` is three times the size of `insars`.

Given the stress field `stresses` from the previous example, as well as the `dikes` orientation from observation, compute the corresponding cost for dikes. The cost function used will be [[costJoint]]

The weight for insar data is 3 (see [[costInsar]]), while the cost for dike is 1 (default value).

```ts
import { geology as geol, geophysics as phy, utils } from 'fast-computation'

const cost =
  (phy
    .generateInsar(displs, [0.01, -0.1, -0.9856])
    .reduce(
      (acc, v, i) => acc + phy.costInsar(insars[i], v, 3) / insars.length,
    ) +
    utils
      .chuncks(stresses, 6)
      .reduce(
        (acc, s, i) =>
          acc + geol.costDike(dikes[i], s, 1) / stresses.length / 6,
      )) /
  2
```
