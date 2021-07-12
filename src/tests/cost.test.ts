import * as geo from '../lib'
import * as df from '@youwol/dataframe'
import { Serie } from '@youwol/dataframe'
import { equals } from '@youwol/math'

test('test cost gps', () => {
    const measure = Serie.create({array: [1,1,1, 2,2,2, 3,3,3, 4,4,4, 5,5,5], itemSize: 3})
    const compute = Serie.create({array: [1,1,1, 2,2,2, 3,3,3, 4,4,4, 5,5,5], itemSize: 3})
    //expect( geo.costGps({measure, compute}) ).toBeCloseTo(0)
})

test('test cost vertical gps', () => {
    const measure = Serie.create({array: [1, 2, 3, 4], itemSize: 1})
    const compute = Serie.create({array: [1, 2, 3, 4], itemSize: 1})
    //expect( geo.costVerticalGps({measure, compute}) ).toEqual(0)
})

test('test cost insar', () => {
    const U = Serie.create({array: new Array(4*3).fill(0).map(_=>Math.random()), itemSize: 3})
    const compute = geo.generateInsar(U, [0.01, -0.1, 0.98])
    const measure = df.duplicate(compute)
    //expect( geo.costVerticalGps({measure, compute}) ).toEqual(0)

    measure.array[0] += 0.5 // blur
    //expect( geo.costVerticalGps({measure, compute}) ).not.toBe(0)
})

test('test cost joint', () => {
    const dataframe = df.DataFrame.create({
        series: {
            normal: Serie.create({array: [0, 0, 1], itemSize: 3})
        }
    }) 
    
    const data = new geo.JointData({
        dataframe,
        measure: 'normal',
        //compute: ['S1', 'S2', 'S3']
    })

    {
        const c = data.costs(Serie.create({array: [0, 0, 1], itemSize: 3}))
        expect( c.array[0] ).toBeCloseTo(0)
    }
    {
        const c = data.costs(Serie.create({array: [1, 0, 0], itemSize: 3}))
        expect( c.array[0] ).toBeCloseTo(1)
    }
    {
        const c = data.costs(Serie.create({array: [0, 1, 0], itemSize: 3}))
        expect( c.array[0] ).toBeCloseTo(1)
    }
})
