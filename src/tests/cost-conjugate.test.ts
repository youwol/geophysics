import { Serie } from '@youwol/dataframe'
import { vec } from '@youwol/math'
import { generateConjugate } from '../lib'

const tests = [
    [0.5, 0, 0, 0.75, 0, 1, 0, 90, 90, 0, 0, 60, 90, 60, 270],
    [
        0.80854812, 0.027959645, 0, 0.89145188, 0, 0.85, 1, 90, 287, 90, 197,
        90, 257, 90, 317,
    ],
    [
        0.39160249, 0.21580194, 0, 0.80839751, 0, 0.2, 2, 0, 0, 90, 203, 30,
        203, 30, 23,
    ],
    [
        1.1010926, -0.010395585, 0, 1.1989074, 0, 0.1, 2, 0, 0, 90, 174, 30,
        174, 30, 354,
    ],
    [0.65, 0, 0, 0.55, 0, 0.6, 1, 90, 0, 90, 90, 90, 30, 90, 330],
    [
        0.2067101, 0.004698463, 0, 0.2032899, 0, 1.2, 0, 90, 325, 0, 0, 60, 325,
        60, 145,
    ],
    [20, 0, 0, 60, 0, 50, 1, 90, 90, 90, 0, 90, 60, 90, 120],
    [
        0.039007455, 0.068337281, 0, 0.17099255, 0, 0.1, 1, 90, 293, 90, 203,
        90, 263, 90, 323,
    ],
    [51, 0, 0, 50, 0, 100, 0, 90, 0, 0, 0, 60, 0, 60, 180],
    [
        90.138496, -23.085006, 0, 38.861504, 0, 100, 0, 90, 21, 0, 0, 60, 21,
        60, 201,
    ],
    [
        2.5348782, 0.49878203, 0, 2.4651218, 0, 1, 2, 0, 0, 90, 47, 30, 47, 30,
        227,
    ],
    [
        2991.9217, -3.9400538, 0, 2998.0783, 0, 1000, 2, 0, 0, 90, 154, 30, 154,
        30, 334,
    ],
]

const fractureCost = (n: vec.Vector3, N: vec.Vector3) => {
    return 1.0 - Math.abs(vec.dot(n, N))
}

function getConjugate(stress: Serie): Serie | Serie[] {
    return generateConjugate({
        stress,
        friction: 30,
        projected: false,
    })
}

function getCosts(measure: Serie, compute: Serie /*{ n1: Serie; n2: Serie }*/) {
    return measure.normalize().map((normal, i) => {

        // const n1 = compute[0].itemAt(i)
        // const n2 = compute[1].itemAt(i)
        // return Math.min(
        //     fractureCost(normal, n1 as vec.Vector3),
        //     fractureCost(normal, n2 as vec.Vector3),
        // )

        const n1 = compute.itemAt(i)
        return fractureCost(normal, n1 as vec.Vector3)
    })
}

function getStress(id: number) {
    const values = tests[id]
    return Serie.create({
        array: [
            values[0],
            values[1],
            values[2],
            values[3],
            values[4],
            values[5],
        ],
        itemSize: 6,
    })
}

test('cost conjugate', () => {
    const stress = getStress(0)
    const compute = getConjugate(stress)

    let measure = Serie.create({
        array: [-Math.sqrt(3) / 2, -0, -0.5],
        itemSize: 3,
    })

    for (let j = 0; j < 1; ++j) {
        let costs = getCosts(measure, compute[j])
        expect(costs.array[0]).toBeCloseTo(0.5) // <---------- ??? instead of 0?

        measure = Serie.create({
            array: [-Math.sqrt(3) / 2, -0, -0.6],
            itemSize: 3,
        })
        costs = getCosts(measure, compute[j])
        expect(costs.array[0]).toBeGreaterThan(0)

        for (let i = 0; i < 100; ++i) {
            measure = Serie.create({
                array: [
                    0.5 - Math.random(),
                    0.5 - Math.random(),
                    0.5 - Math.random(),
                ],
                itemSize: 3,
            })
            costs = getCosts(measure, compute[j])
            expect(costs.array[0]).toBeGreaterThan(0)
            expect(costs.array[0]).toBeLessThan(1)
        }
    }
})
