import * as geophysics from '../lib'
//import * as df from '@youwol/dataframe'
import * as math from '@youwol/math'
import { GpsData, InsarData } from '../lib'
import { createData } from '../lib/data'
import { Serie, DataFrame, append } from '@youwol/dataframe'

test('test inverse', () => {

    // From computation

    let dfInsar = DataFrame.create({
        series: {
            'd1': Serie.create({array: [1,1,1, 2,2,2, 3,3,3, 4,4,4, 5,5,5], itemSize: 3}),
            'd2': Serie.create({array: [6,6,6, 7,7,7, 8,8,8, 9,9,9, 10,10,10], itemSize: 3}),
            'd3': Serie.create({array: [11,11,11, 12,12,12, 13,13,13, 15,15,15, 16,16,16], itemSize: 3})
        }
    })

    let dfGps = DataFrame.create({
        series: {
            'u1': Serie.create({array: [1,1,1, 2,2,2, 3,3,3, 4,4,4, 5,5,5], itemSize: 3}),
            'u2': Serie.create({array: [6,6,6, 7,7,7, 8,8,8, 9,9,9, 10,10,10], itemSize: 3}),
            'u3': Serie.create({array: [11,11,11, 12,12,12, 13,13,13, 15,15,15, 16,16,16], itemSize: 3})
        }
    })

    // Generate measured data

    const alpha = [0.9, 0.1, 0.5]
    const LOS = [-0.1, 0.2, 0.93]

    dfInsar = append(dfInsar, {
        'insar': math.dot( math.weightedSum([dfInsar.series['d1'], dfInsar.series['d2'], dfInsar.series['d3']], alpha), LOS )
    })

    dfGps = append(dfGps, {
        'gps'  : math.weightedSum([dfGps.series['u1'], dfGps.series['u2'], dfGps.series['u3']], alpha)
    })

    const result = geophysics.monteCarlo({
        data: [
            createData(GpsData, {
                dataframe: dfGps,
                measure: 'gps',
                compute: ['u1', 'u2', 'u3']
            }),
            createData(InsarData, {
                dataframe: dfInsar,
                los: LOS as math.vec.Vector3,
                measure: 'insar',
                compute: ['d1', 'd2', 'd3']
            })
        ],
        alpha: {
            mapping: undefined,
            min: [0,0,0], // therefore dim=3
            max: [1,1,1]
        }
    }, 10000)

    console.log( result )
    expect(result.cost).toBeCloseTo(0)
})
