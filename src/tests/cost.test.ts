import * as geo from '../lib'
import * as df from '@youwol/dataframe'
import { GpsData } from '../lib'
import { DataFrame } from '@youwol/dataframe'

test('test cost gps', () => {
    const measure = df.createSerie({data: [1,1,1, 2,2,2, 3,3,3, 4,4,4, 5,5,5], itemSize: 3})
    const compute = df.createSerie({data: [1,1,1, 2,2,2, 3,3,3, 4,4,4, 5,5,5], itemSize: 3})
    //expect( geo.costGps({measure, compute}) ).toBeCloseTo(0)
})

test('test cost vertical gps', () => {
    const measure = df.createSerie({data: [1, 2, 3, 4], itemSize: 1})
    const compute = df.createSerie({data: [1, 2, 3, 4], itemSize: 1})
    //expect( geo.costVerticalGps({measure, compute}) ).toEqual(0)
})

test('test cost insar', () => {
    const U = df.createSerie({data: new Array(4*3).fill(0).map(_=>Math.random()), itemSize: 3})
    const compute = geo.generateInsar(U, [0.01, -0.1, 0.98])
    const measure = df.duplicate(compute)
    //expect( geo.costVerticalGps({measure, compute}) ).toEqual(0)

    measure.array[0] += 0.5 // blur
    //expect( geo.costVerticalGps({measure, compute}) ).not.toBe(0)
})