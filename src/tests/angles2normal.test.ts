import { Serie } from "@youwol/dataframe"
import { fromDipDipAzimToNormal } from "../lib/utils/fromDipDipAzimToNormal"

test('for joints', () => {
    const any = 123

    // [dip, dipAzim]
    const joints = [
        [90, 90],
        [90, 107],
        [0, any],
        [0, any],
        [90, 0],
        [90, 145],
        [90, 90],
        [90, 113],
        [90, 0],
        [90, 21],
        [0, any],
        [0, any]
    ]

    const normals = [
        1, 0, 0,
        0.956304756, -0.292371705, 0,
        0, 0, 1,
        0, 0, 1,
        0, 1, 0,
        0.573576436, -0.819152044, 0,
        1, 0, 0,
        0.920504853, -0.390731128, 0,
        0, 1, 0,
        0.35836795, 0.933580426, 0,
        0, 0, 1,
        0, 0, 1
    ]

    const serieNormals = Serie.create({ array: normals, itemSize: 3 })

    joints.forEach((joint, index) => {
        const N = serieNormals.itemAt(index)
        const n = fromDipDipAzimToNormal({ dipAngle: joint[0], dipAzimuth: joint[1] })

        for (let i = 0; i < 3; ++i) {
            expect(n[i]).toBeCloseTo(N[i])
        }
    })
})
