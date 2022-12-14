import { Serie } from '@youwol/dataframe'
import { eigenVector, mat, Quaternion } from '@youwol/math'

export function failurePlanes({
    positions,
    stress,
    friction = 30,
}: {
    positions: Serie
    stress: Serie
    friction?: number
}) {
    const fricAngle = (friction * Math.PI) / 180
    const { n1, n2 } = createPrimitive(fricAngle)

    // const matrix = new Matrix4()

    const eigv = eigenVector(stress)
    const quat = new Quaternion()
    return eigv.map((vectors, i) => {
        const m = mat.unpack([
            vectors[0],
            vectors[3],
            vectors[6],
            vectors[1],
            vectors[4],
            vectors[7],
            vectors[2],
            vectors[5],
            vectors[8],
        ])
        quat.setFromRotationMatrix(m)
        const rot = quat.toMatrix()

        return {
            n1: mat.multVec(rot, n1),
            n2: mat.multVec(rot, n2),
        }
    })
}

// ------------------------------------------------

function createPrimitive(fric: number) {
    const ang = deg2rad(45.0 - fric / 2.0)
    return {
        n1: mat.multVec(makeRotationY(ang), [0, 0, 1]),
        n2: mat.multVec(makeRotationY(-ang), [0, 0, 1]),
    }
}

function deg2rad(a: number) {
    return (a * Math.PI) / 180
}

function makeRotationY(theta: number) {
    const c = Math.cos((theta * Math.PI) / 180),
        s = Math.sin((theta * Math.PI) / 180)
    return mat.unpack([c, 0, s, 0, 1, 0, -s, 0, c])
}
