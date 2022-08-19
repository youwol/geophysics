import * as geo from '../lib'
import * as df from '@youwol/dataframe'
import { Serie } from '@youwol/dataframe'
import { equals } from '@youwol/math'


test('test cost conjugate', () => {
    const dataframe = df.DataFrame.create({
        series: {
            normal: Serie.create({array: [0, 0, 1], itemSize: 6})
        }
    })
    
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
