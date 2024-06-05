import { eigen, Quaternion, vec } from '@youwol/math'

const deg2rad = (a: number) => (a * Math.PI) / 180

/**
 * Get the normal of the two shear planes according to the three eigen vectors
 * of a streess tensor
 * @category Utils
 */
export function shearPlanes(stress: vec.Vector6, fric = 30) {
    /*eslint unused-imports/no-unused-vars: off -- obvious*/
    const { values, vectors } = eigen(stress)

    const S2 = [vectors[3], vectors[4], vectors[5]] as vec.Vector3
    const S3 = [vectors[6], vectors[7], vectors[8]] as vec.Vector3

    const ang = deg2rad(45.0 - fric / 2.0)
    let q = Quaternion.fromAxisAngle(S2, ang)
    const n1 = q.rotate(S3)

    q = Quaternion.fromAxisAngle(S2, -ang)
    const nS3 = S3.map((v) => -v) as vec.Vector3
    const n2 = q.rotate(nS3)

    return { n1, n2 } // ok
}
