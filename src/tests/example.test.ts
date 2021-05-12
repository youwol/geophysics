import * as geophysics from '../lib'
import * as df from '@youwol/dataframe'
import * as math from '@youwol/math'
import { GpsData, InsarData } from '../lib'
import { createData } from '../lib/data'

test('test inverse', () => {

    // From computation

    let dfInsar = new df.DataFrame({
        'd1': df.createSerie({data: [1,1,1, 2,2,2, 3,3,3, 4,4,4, 5,5,5], itemSize: 3}),
        'd2': df.createSerie({data: [6,6,6, 7,7,7, 8,8,8, 9,9,9, 10,10,10], itemSize: 3}),
        'd3': df.createSerie({data: [11,11,11, 12,12,12, 13,13,13, 15,15,15, 16,16,16], itemSize: 3})
    })

    let dfGps = new df.DataFrame({
        'u1': df.createSerie({data: [1,1,1, 2,2,2, 3,3,3, 4,4,4, 5,5,5], itemSize: 3}),
        'u2': df.createSerie({data: [6,6,6, 7,7,7, 8,8,8, 9,9,9, 10,10,10], itemSize: 3}),
        'u3': df.createSerie({data: [11,11,11, 12,12,12, 13,13,13, 15,15,15, 16,16,16], itemSize: 3})
    })

    // Generate measured data

    const alpha = [0.9, 0.1, 0.5]
    const LOS = [-0.1, 0.2, 0.93]

    dfInsar = df.append(dfInsar, {
        'insar': math.dot( math.weightedSum([dfInsar.get('d1'), dfInsar.get('d2'), dfInsar.get('d3')], alpha), LOS )
    })

    dfGps = df.append(dfGps, {
        'gps'  : math.weightedSum([dfGps.get('u1'), dfGps.get('u2'), dfGps.get('u3')], alpha)
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
