import * as geo from '../lib'
import { Serie } from '@youwol/dataframe'

test('shear planes', () => {
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

    // [n1x, n1y, n1z, n2x, n2y, n2z]
    // where n1 and n2 are the normals of the 2 shear planes
    const shears = [
        [0.866, 0, -0.5, -0.866, 0, -0.5],
        [0.9743700648, 0.2249510543, 0, -0.6819983601, 0.7313537016, 0],
        [-0.1953655642, -0.4602524267, 0.8660254038, -0.1953655642, -0.4602524267, -0.8660254038],
        [0.05226423163, -0.4972609477, 0.8660254038, 0.05226423163, -0.4972609477, -0.8660254038],
        [-0.5, 0.8660254038, 0, -0.5, -0.8660254038, 0],
        [-0.4967317649, 0.7094064799, 0.5, 0.4967317649, -0.7094064799, 0.5],
        [0.866, 0.5, 0, -0.866, 0.5, 0],
        [0.9925461516, 0.1218693434, 0, -0.6018150232, 0.79863551, 0],
        [0, 0.866, 0.5, 0, -0.866, 0.5],
        [0.3103557482, 0.8085043658, 0.5, -0.3103557482, -0.8085043658, 0.5],
        [0.3656768508, 0.34099918, 0.8660254038, 0.3656768508, 0.34099918, -0.8660254038],
        [0.2191855734, -0.4493970232, 0.8660254038, 0.2191855734, -0.4493970232, -0.8660254038]
    ]

    stresses.forEach((stress, index) => {

        // See shear-planes.test.ts
        const generated = geo.generateConjugate({
            stress: Serie.create({ array: stress, itemSize: 6 }),
            friction: 30,
            projected: false
        })

        const expected = shears[index]

        // Plane 1
        expect(generated.array[0]).toBeCloseTo(expected[0])
        expect(generated.array[1]).toBeCloseTo(expected[1])
        expect(generated.array[2]).toBeCloseTo(expected[2])

        // Plane 2
        expect(generated.array[3]).toBeCloseTo(expected[3])
        expect(generated.array[4]).toBeCloseTo(expected[4])
        expect(generated.array[5]).toBeCloseTo(expected[5])

    })
})
