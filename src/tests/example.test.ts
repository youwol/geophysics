import * as geo from '../lib'
import * as df from '@youwol/dataframe'

test('test inverse', () => {

    let d = new df.DataFrame({
        // Computed
        'd1': df.createSerie({data: [ 1, 2, 3, 4, 5], itemSize: 1}),
        'd2': df.createSerie({data: [ 6, 7, 8, 9,10], itemSize: 1}),
        'd3': df.createSerie({data: [11,12,13,15,16], itemSize: 1}),
        'u1': df.createSerie({data: [1,1,1, 2,2,2, 3,3,3, 4,4,4, 5,5,5], itemSize: 3}),
        'u2': df.createSerie({data: [6,6,6, 7,7,7, 8,8,8, 9,9,9, 10,10,10], itemSize: 3}),
        'u3': df.createSerie({data: [11,11,11, 12,12,12, 13,13,13, 15,15,15, 16,16,16], itemSize: 3}),

        // Measured
        'insar': df.createSerie({data: [1,2,3,4,5], itemSize: 1}),
        'gps': df.createSerie({data: [1,1,1,2,2,2,3,3,3,4,4,4,5,5,5], itemSize: 3})
    })

    const result = geo.monteCarlo({
        data: [
            {
                dataframe: d,
                measure  : 'insar',
                calculus : ['d1', 'd2', 'd3'],
                cost     : geo.costInsar
            },
            {
                dataframe: d,
                measure  : 'gps',
                calculus : ['u1', 'u2', 'u3'],
                cost     : geo.costGps,
                weight   : 1
            }
        ],
        alphaParameters: { 
            mapping: undefined,
            min: [0,0,0],
            max: [1,1,1]
        }
    }, 10000)
    console.log( result )

})
