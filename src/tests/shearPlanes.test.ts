import { Serie } from '@youwol/dataframe'
import { eigen, Quaternion, vec } from '@youwol/math'
import {
    between_0_360,
    rad2deg,
} from '../../../geometry/src/lib/extrude/angles'

const deg2rad = (a: number): number => (a * Math.PI) / 180

/**
 * Get the normal of the two shear planes according to the three eigen vectors
 * of a streess tensor
 */
function shearPlanes(stress: vec.Vector6, fric = 30) {
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

// ------------------------------------------------------------------------

// 0   1   2   3   4   5   6             7        8          9            10             11             12               13             14
// Sxx Sxy Sxz Syy Syz Szz regime(0,1,2) JointDip JointDipAz StyloliteDip StyloliteDipAz ShearPlane1Dip ShearPlane1DipAz ShearPlane2Dip ShearPlane2DipAz
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

/**
 * Test that according to a stress tensor, we get the right
 * shear failure plane orientations
 */
test('shear planes', () => {
    function perform(testId: number) {
        const values = tests[testId]
        const S = Serie.create({
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

        const planes = shearPlanes(S.itemAt(0) as vec.Vector6, 30)
        console.log(planes)

        // -----------------------------------------------------

        // Ok
        const converter = new AnglesToNormal()
        converter.setOrientation({ dipAngle: 90, dipAzimuth: 90 })
        console.log('normal', converter.normal)

        // converter.setNormal(planes.n1 as vec.Vector3)
        // console.log(converter.dipAngle, converter.dipAzimuth)

        // converter.setOrientation({ dipAngle: values[11], dipAzimuth: values[12] })
        // console.log(converter.normal)
        // converter.setOrientation({ dipAngle: values[13], dipAzimuth: values[14] })
        // console.log(converter.normal)

        console.warn('TO BE DONE')
        expect(true).toBeTruthy()
    }

    perform(0)
    perform(6)
    perform(8)
})

class AnglesToNormal {
    private _dip = 0
    private _dipAzim = 0
    private _n: vec.Vector3 = undefined

    get dipAngle() {
        return this._dip
    }
    get dipAzimuth() {
        return this._dipAzim
    }
    get strikeAngle() {
        return between_0_360(this._dipAzim - 90)
    }
    get strikeVector() {
        let l = vec.norm(this._n)
        if (l === 0) {
            l = 1
        }
        let nx = this._n[0] / l
        let ny = this._n[1] / l
        if (this._n[2] < 0) {
            nx = -nx
            ny = -ny
        }
        let s = [-ny, nx, 0] as vec.Vector3
        s = vec.normalize(s) as vec.Vector3
        return s
    }
    get normal() {
        return this._n
    }
    get normalX() {
        return this._n[0]
    }
    get normalY() {
        return this._n[1]
    }
    get normalZ() {
        return this._n[2]
    }

    setNormal(n: vec.Vector3) {
        this.__set_normal__(n)
        const n_ = this._n

        // Get the dip-azimuth
        let l = vec.norm(this._n)
        if (l === 0) {
            l = 1
        }

        let nx = n_[0] / l
        let ny = n_[1] / l
        let nz = n_[2] / l

        if (n_[2] < 0) {
            // put the nornal up
            nx *= -1
            ny *= -1
            nz *= -1
        }

        const alpha = rad2deg(Math.asin(nx))
        // console.log('alpha', alpha)

        // if (ny < 0) {
        //     alpha = 180 - alpha
        // }
        // if (alpha < 0) {
        //     alpha = 360 + alpha
        // }
        const dip_azim = alpha

        // Get the dip-angle
        let dip = 0
        if (nz >= 0) {
            dip = rad2deg(Math.acos(nz))
        } else {
            dip = rad2deg(Math.acos(-nz))
        }
        this._dip = dip
        this._dipAzim = dip_azim
    }

    setOrientation({
        dipAngle,
        dipAzimuth,
    }: {
        dipAngle: number
        dipAzimuth: number
    }) {
        this.__set_angles__(dipAngle, dipAzimuth)
        const delta = deg2rad(dipAngle)
        const alpha = deg2rad(dipAzimuth)

        this._n = vec.normalize([
            Math.sin(delta) * Math.sin(alpha),
            Math.sin(delta) * Math.cos(alpha),
            Math.cos(delta),
        ]) as vec.Vector3
    }

    __set_normal__(n: vec.Vector3) {
        this._n = vec.clone(n) as vec.Vector3
        this._n = vec.normalize(this._n) as vec.Vector3
    }

    __set_angles__(dip: number, dipazim: number) {
        this._dip = dip
        this._dipAzim = dipazim
    }
}
