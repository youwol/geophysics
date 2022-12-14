import { DataFrame, Serie } from '@youwol/dataframe'
import {
    abs,
    div,
    dot,
    eigen,
    normalize,
    rotateAxis,
    square,
    sub,
    vec,
    weightedSum,
} from '@youwol/math'
import { Data } from '../data'
import { Alpha } from '../types'

const getTheta = (friction: number): number =>
    (Math.PI * (45 - friction / 2)) / 180

/**
 * Cost for conjugate planes
 *
 * <center><img style="width:50%; height:50%;" src="media://conjugate.png"></center>
 * <center><blockquote><i>
 * Relation between a shear fracture and the three principales stresses
 * </i></blockquote></center>
 *
 * @example
 * ```ts
 * const data = new ConjugateData({
 *     dataframe,
 *     measure: 'n',
 *     compute: ['S1', 'S2', 'S3'],
 *     weight: 1,
 *     weights: 'ptsWeights',
 *     friction: 60,
 *     project: true
 * })
 * ```
 * @see [[Data]]
 * @see [[monteCarlo]]
 * @see [[createData]]
 * @category Geology
 */
export class ConjugateData extends Data {
    theta = (Math.PI * (45 - 60 / 2)) / 180
    protected projected = false
    protected friction: number

    constructor({
        dataframe,
        measure,
        compute,
        weights,
        weight,
        friction = 0.3,
        projected = false,
    }: {
        dataframe: DataFrame
        measure: string
        compute?: string[]
        weights?: string
        weight?: number
        friction: number
        projected?: boolean
    }) {
        super({ dataframe, measure, compute, weights, weight })
        this.measure = normalize(this.measure)
        this.projected = projected !== undefined ? projected : false
        if (friction !== undefined) {
            this.friction = friction
            this.theta = (Math.PI * (45 - friction / 2)) / 180
        }

        if (this.projected) {
            this.measure = this.measure.map((v) => {
                const x = v[0]
                const y = v[1]
                const l = Math.sqrt(x ** 2 + y ** 2)
                return [x / l, y / l, 0]
            })
        }
    }

    name() {
        return 'ConjugateData'
    }

    costs(alpha: Serie | Alpha): Serie {
        const d = this.generateData(alpha)

        if (this.projected) {
            if (d.itemSize !== 3)
                throw new Error(
                    'generateData must have itemSize = 3 (i.e., normal)',
                )
            return this.measure.map((n1: number[], i: number) => {
                const L = Math.sqrt(n1[0] ** 2 + n1[1] ** 2)
                const nn = [n1[0] / L, n1[1] / L, 0] as vec.Vector3
                const N = d.itemAt(i) as vec.Vector3 //this.fractureNormal(d.itemAt(i) as vec.Vector3) // Sigma2, so very simple
                return this.fractureCost(nn, N)
            })
        }

        // we have {n1, n2}
        return this.measure.map((normal, i) => {
            // const {n1, n2} = this.conjugateNormals(d.itemAt(i) as vec.Vector6)
            // const dd = d as {n1: Serie, n2: Serie}
            const n1 = d.n1.itemAt(i)
            const n2 = d.n2.itemAt(i)
            return Math.min(
                this.fractureCost(normal, n1 as vec.Vector3),
                this.fractureCost(normal, n2 as vec.Vector3),
            )
        })
    }

    generate(alpha: Alpha): Serie {
        return generateConjugate({
            stress: weightedSum(this.compute, alpha),
            friction: this.friction,
            projected: this.projected,
        }) as Serie
    }

    // private conjugateNormals = (stress: vec.Vector6) => {
    //     const e = eigen(stress)
    //     const nS3 = [-e.vectors[0], -e.vectors[1], -e.vectors[2]] as vec.Vector3
    //     const v2  = [-e.vectors[3], -e.vectors[4], -e.vectors[5]] as vec.Vector3
    //     const v3  = [-e.vectors[6], -e.vectors[7], -e.vectors[8]] as vec.Vector3
    //     return {
    //         n1: rotateAxis(v2,  this.theta, v3),
    //         n2: rotateAxis(v2, -this.theta, nS3)
    //     }
    // }

    // private fractureNormal = (stress: vec.Vector6) => {
    //     // console.log(stress)
    //     const e = eigen(stress)
    //     const v2 = [e[3], e[4], e[5]]
    //     if (this.projected) {
    //         const d = Math.sqrt(v2[0]**2 + v2[1]**2)
    //         v2[0] /= d
    //         v2[1] /= d
    //         v2[2]  = 0
    //     }
    //     return [v2[1], -v2[0], v2[2]] // orthogonal projected
    // }

    private fractureCost = (n: vec.Vector3, N: vec.Vector3) => {
        return 1.0 - Math.abs(vec.dot(n, N))
    }
}

/**
 * Generate from stress data either 2 series representing the normals of the conjugate planes,
 * or one serie if projected = true (direction of S2). For the former case, the friction angle
 * is used. For the later, friction angle is irrelevant.
 * @example
 * ```ts
 * const {n1, n2} = geop.generateConjugates({
 *      stress: computedStressSerie,
 *      friction: 30,
 *      projected: false
 * })
 * console.log( n1, n2 )
 * ```
 * @see [[ConjugateData]]
 * @category Geology
 */
export function generateConjugate({
    stress,
    friction,
    projected = false,
}: {
    stress: Serie
    friction: number
    projected?: boolean
}): { n1: Serie; n2: Serie } | Serie {
    if (stress === undefined) {
        throw new Error('provided stress Serie is undefined')
    }

    if (friction === undefined) {
        throw new Error('provided friction is undefined')
    }

    if (projected === true) {
        return stress.map((s) => {
            const e = eigen(s).vectors
            const v2 = [e[3], e[4], e[5]]
            if (projected === true) {
                const d = Math.sqrt(v2[0] ** 2 + v2[1] ** 2)
                v2[0] /= d
                v2[1] /= d
                v2[2] = 0
            }
            return [v2[1], -v2[0], v2[2]]
        })
    }

    const theta = getTheta(friction)
    const eigV = stress.map((s) => eigen(s).vectors)

    return {
        n1: eigV.map((e) => {
            const v2 = [-e[3], -e[4], -e[5]] as vec.Vector3
            const v3 = [-e[6], -e[7], -e[8]] as vec.Vector3
            return rotateAxis(v2, theta, v3)
        }),
        n2: eigV.map((e) => {
            const nS3 = [-e[0], -e[1], -e[2]] as vec.Vector3
            const v2 = [-e[3], -e[4], -e[5]] as vec.Vector3
            return rotateAxis(v2, -theta, nS3)
        }),
    }

    /*
    return {
        n1: stress.map( s => {
            const e = eigen(s).vectors
            const v2  = [-e[3], -e[4], -e[5]] as vec.Vector3
            const v3  = [-e[6], -e[7], -e[8]] as vec.Vector3
            return rotateAxis(v2,  theta, v3)
        }),
        n2: stress.map( s => {
            const e = eigen(s).vectors
            const nS3 = [-e[0], -e[1], -e[2]] as vec.Vector3
            const v2  = [-e[3], -e[4], -e[5]] as vec.Vector3
            return rotateAxis(v2, -theta, nS3)
        })
    }
    */
}
