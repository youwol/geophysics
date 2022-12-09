import * as geo from '../lib'
import { Serie, DataFrame } from '@youwol/dataframe'

test('test cost conjugate', () => {
    const dataframe = DataFrame.create({
        series: {
            normal: Serie.create({array: [0, 0, 1], itemSize: 3})
        }
    })
    
    // ---------------------------------------------------------
    // To be reactivated later on when the cost will be ready...
    // ---------------------------------------------------------
    if (0) {
        const data = new geo.ConjugateData({
            dataframe,
            measure: 'normal',
            friction: 30
        })

        const c = data.costs(Serie.create({array: [0, 0, 1], itemSize: 3}))
        expect( c.array[0] ).toBeCloseTo(0)
    }
})
