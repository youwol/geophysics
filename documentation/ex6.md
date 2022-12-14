Using a flatten horizon as data to constrain the inversion

```ts
const io = require('@youwol/io')
const df = require('@youwol/dataframe')
const math = require('@youwol/math')
const geom = require('@youwol/geometry')
const fs = require('fs')

const data = fs.readFileSync('./horizon.ts', 'utf8')
const dfs = io.decodeGocadTS(data)[0]

const points = dfs.get('positions') // get the points coordinates only

const plane = geom.fittingPlane(points)
const vectors = geom.vectorFromPointsToPlane(points, plane)

const displField1 = arche.computeDispl(points) // computed by arche
const displField2 = arche.computeDispl(points)
const displField3 = arche.computeDispl(points)

let dataframe = new DataFrame({
    U1: createSerie({ data: displField1, itemSize: 3 }),
    U2: createSerie({ data: displField2, itemSize: 3 }),
    U3: createSerie({ data: displField3, itemSize: 3 }),
    gps: createSerie({ data: vectors }),
})

// The gps dataset
const gps = new GpsData({
    dataframe,
    measure: 'gps',
    compute: ['U1', 'U2', 'U3'],
})

// The stochastic inversion
const result = monteCarlo(
    {
        data: [gps],
        alpha: {
            mapping: undefined,
            min: [-10, -5, 0],
            max: [-7, 0, 10],
        },
    },
    100000,
)
```
