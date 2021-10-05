import { Serie, DataFrame, append } from '@youwol/dataframe'
import { forward } from '../lib'

test('test inverse', () => {

    let df = DataFrame.create({
        series: {
            'u1': Serie.create({array: [1,1,1, 2,2,2, 3,3,3, 4,4,4, 5,5,5], itemSize: 3}),
            'u2': Serie.create({array: [6,6,6, 7,7,7, 8,8,8, 9,9,9, 10,10,10], itemSize: 3}),
            'u3': Serie.create({array: [11,11,11, 12,12,12, 13,13,13, 15,15,15, 16,16,16], itemSize: 3})
        }
    })

    const r = [21,21,21,  32,32,32,  43,43,43,  55,55,55,  66,66,66]
    const a = forward.attribute({simulations: df, alpha: [10,0,1], name: 'u', startIndex: 1})
    expect(a.array).toEqual(r)
    expect(a.itemSize).toEqual(3)
})
