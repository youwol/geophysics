import * as geo from '../lib'
import { Serie, DataFrame } from '@youwol/dataframe'

test('cost joint', () => {

    // [xx, xy, xz, yy, yz, zz]
    const stresses = [
        [0.5, 0, 0, 0.75, 0, 1],
        [0.80854812, 0.027959645, 0, 0.89145188, 0, 0.85],
        [0.39160249, 0.21580194, 0, 0.80839751, 0, 0.2],
        [1.1010926, -0.010395585, 0, 1.1989074, 0, 0.1],
        [0.65, 0, 0, 0.55, 0, 0.6],
        [0.2067101, 0.004698463, 0, 0.2032899, 0, 1.2],
        [20, 0, 0, 60, 0, 50],
        [0.039007455, 0.068337281, 0, 0.17099255, 0, 0.1],
        [51, 0, 0, 50, 0, 100],
        [90.138496, -23.085006, 0, 38.861504, 0, 100],
        [2.5348782, 0.49878203, 0, 2.4651218, 0, 1],
        [2991.9217, -3.9400538, 0, 2998.0783, 0, 1000]
    ]

    // [nx, ny, nz]
    const joints = [
        [1, 0, 0],
        [0.956304756, -0.292371705, 0],
        [0, 0, 1],
        [0, 0, 1],
        [0, 1, 0],
        [-0.573576436, 0.819152044, 0],
        [1, 0, 0],
        [0.920504853, -0.390731128, 0],
        [0, 1, 0],
        [0.35836795, 0.933580426, 0],
        [0, 0, 1],
        [0, 0, 1]
    ]

    stresses.forEach((stress, index) => {

        const generated = geo.generateJoint({
            stress: Serie.create({ array: stress, itemSize: 6 }),
            projected: false
        })

        const dataframe = DataFrame.create({
            series: {
                normal: Serie.create({ array: joints[index], itemSize: 3 }),
            }
        })

        const measure = new geo.JointData({
            dataframe,
            measure: 'normal'
        })
    
        const c = measure.costs(generated)
        expect(c.array[0]).toBeCloseTo(0)
    })

})
