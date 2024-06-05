import * as math from '@youwol/math'
//import { dot, weightedSum } from '@youwol/math'
import { DataFrame, Serie } from '@youwol/dataframe'
import { monteCarlo, InsarData } from '../lib'

test('inverse', () => {
    // From computation
    const displField1 = [1, 2, 3, 4, 5, 8, 5, 6, 3, 9, 9, 1, 3, 2, 4]
    const displField2 = [7, 7, 8, 11, 9, 4, 10, 6, 11, 13, 27, 7, 9, 7, 5]
    const displField3 = [1, 12, 13, 5, 8, 10, 10, 6, 7, 5, 9, 17, 9, 14, 20]
    // Measurements
    const insarMeasurements = [-8.732, 45.8457, 22.518, -20.6505, -25.394]

    const dataframe = DataFrame.create({
        series: {
            U1: Serie.create({ array: displField1, itemSize: 3 }),
            U2: Serie.create({ array: displField2, itemSize: 3 }),
            U3: Serie.create({ array: displField3, itemSize: 3 }),
            insar: Serie.create({ array: insarMeasurements, itemSize: 1 }),
        },
    })

    const los = [0.01, -0.2, -0.95]
    const insar = new InsarData({
        dataframe,
        normalize: true,
        los: los as math.vec.Vector3,
        measure: 'insar',
        compute: ['U1', 'U2', 'U3'],
    })

    const result = monteCarlo(
        {
            data: [insar],
            alpha: {
                mapping: undefined,
                min: [-10, -5, 0],
                max: [-7, 0, 10],
            },
        },
        100000,
    )

    expect(result.cost).toBeCloseTo(0)

    // console.log('inversion result:', result)
    // console.log('measured ', dataframe.series['insar'].array)
    // console.log('recovered', insar.generate(result.alpha).array)
})
