import { DataFrame, Serie, Vector } from '@youwol/dataframe'
import { eigen, Quaternion, vec, weightedSum } from '@youwol/math'
import { Data } from './data'
import { Alpha } from '../types'
import { deg2rad } from '../utils'
import { normalize } from '../utils/normalizeSerie'
import { generatorForNormal } from './utils/generatorForNormal'

const getTheta = (friction: number): number =>
    (Math.PI * (45 - friction / 2)) / 180

/**
 * Parameters for {@link ConjugateData} constructor
 * @category Data/Geology
 */
export type ConjugateDataParams = {
    dataframe: DataFrame
    measure: string
    compute?: string[]
    weights?: string
    weight?: number
    friction: number
    projected?: boolean
    useAngle?: boolean
}

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
 *     compute: ['S1', 'S2', 'S3'], // the 3 serie's names for the stresses
 *     weight: 1,
 *     weights: 'ptsWeights',
 *     friction: 30, // friction angle
 *     project: true
 * })
 * ```
 * @see {@link Data}
 * @see {@link monteCarlo}
 * @see {@link createData}
 * @category Data/Geology
 */
export class ConjugateData extends Data {
    protected theta = getTheta(30)
    protected projected = false
    protected useAngle = true
    protected friction: number

    static clone(params: ConjugateDataParams): Data {
        return new ConjugateData(params)
    }

    constructor({
        dataframe,
        measure,
        compute,
        weights,
        weight,
        friction = 30,
        projected = false,
        useAngle = true,
    }: ConjugateDataParams) {
        super({ dataframe, measure, compute, weights, weight })
        this.measure = normalize(this.measure)
        this.projected = projected !== undefined ? projected : false
        this.useAngle = useAngle !== undefined ? useAngle : true
        if (friction !== undefined) {
            this.friction = friction
            this.theta = (Math.PI * (45 - friction / 2)) / 180
        }

        if (this.projected) {
            this.measure = this.measure.map((v) => {
                const x = v[0]
                const y = v[1]
                let l = Math.sqrt(x ** 2 + y ** 2)
                if (l === 0) {
                    l = 1
                    console.warn(
                        `ConjugateData: measure at index i is horizontal => norm is zero!`,
                        dataframe,
                    )
                }
                return [x / l, y / l, 0]
            })
        }
    }

    name() {
        return 'ConjugateData'
    }

    /**
     * The cost function of the data according to a provided Alpha or a Serie.
     * If alpha is of type {@link Alpha}, then a weigthed sum is performed. Otherwise, if
     * alpha is of type {@link Serie}, then no transformation is done on alpha, and it is
     * considered directly as the generated data.
     */
    costs(alpha: Serie | Alpha): Serie {
        // Will call
        //   1) Data.generateData,
        //   2) then this.generate below,
        //   3) and therefore the function generateConjugate also below
        const d = this.generateData(alpha) as Serie

        if (this.projected) {
            return this.measure.map((n: number[], i: number) => {
                // Note: measure already normalized after projection
                //   const L = Math.sqrt(n[0] ** 2 + n[1] ** 2)
                //   const nn = [n[0] / L, n[1] / L, 0] as vec.Vector3

                const D = d as Serie

                let w = 1
                if (this.weights) {
                    w = this.weights.itemAt(i) as number
                }

                const n1 = D.itemAt(i) as vec.Vector3 // this.fractureNormal(d.itemAt(i) as vec.Vector3) // Sigma2, so very simple
                const c = this.fractureCost(n1, n as vec.Vector3, w)
                if (Number.isNaN(c)) {
                    console.warn(
                        `ConjugateData: cost is NaN for normals ${n1} and ${n}`,
                    )
                }
                return c
            })
        }

        // XALI: 20240604
        // ==============
        // return this.measure.map((normal, i) => {
        //     let w = 1
        //     if (this.weights) {
        //         w = this.weights.itemAt(i) as number
        //     }
        //     return Math.min(
        //         this.fractureCost(normal, d[0].itemAt(i), w),
        //         this.fractureCost(normal, d[1].itemAt(i), w),
        //     )
        // })

        return this.measure.map((normal, i) => {
            const j = 2 * i
            let w = 1

            if (this.weights) {
                w = this.weights.itemAt(i) as number
            }

            return Math.min(
                this.fractureCost(normal, d.itemAt(j) as vec.Vector3, w),
                this.fractureCost(normal, d.itemAt(j + 1) as vec.Vector3, w)
            )
        })
    }

    generate(alpha: Alpha, forExport: boolean): Serie {
        return generateConjugate({
            stress: weightedSum(this.compute, alpha),
            friction: this.friction,
            projected: forExport ? false : this.projected,
        }) as Serie
    }

    generateInDataframe({
        alpha,
        prefix,
        options = undefined,
    }: {
        alpha: Alpha
        prefix: string
        options?: { [key: string]: object }
    }): void {
        generatorForNormal({ data: this, alpha, prefix, options })
    }

    private fractureCost = (n: vec.Vector3, N: vec.Vector3, w: number) => {
        if (this.useAngle) {
            const W = 2 / Math.PI / this.sumWeights
            const v = vec.dot(n, N)
            const a = Math.abs(v)
            return (Math.acos(a > 1 ? 1 : a) * W) / w
        } else {
            // TODO: weights
            return 1.0 - Math.abs(vec.dot(n, N))
        }
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
 * @see {@link ConjugateData}
 * @category Dataframe
 */
export function generateConjugate({
    stress,
    friction,
    projected = false,
}: {
    stress: Serie
    friction: number
    projected?: boolean
}): Serie {
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
                let d = Math.sqrt(v2[0] ** 2 + v2[1] ** 2)
                if (d === 0) {
                    d = 1
                }
                v2[0] /= d
                v2[1] /= d
                v2[2] = 0
            }
            return [v2[1], -v2[0], v2[2]]
        })
    }

    const sp = stress.map((e) => shearPlanes(e, friction))

    // XALI: 20240604
    // ==============
    // return [
    //     sp.map(s => [s[0], s[1], s[2]]),
    //     sp.map(s => [s[3], s[4], s[5]])
    // ]

    return Serie.create({array: sp.array, itemSize: 3, dimension: 3})
}

function shearPlanes(stress: vec.Vector6, fric = 30) {
    const vectors = eigen(stress).vectors

    const S2 = [vectors[3], vectors[4], vectors[5]] as vec.Vector3
    const S3 = [vectors[6], vectors[7], vectors[8]] as vec.Vector3

    const ang = deg2rad(45.0 - fric / 2.0)
    let q = Quaternion.fromAxisAngle(S2, ang)
    const n1 = q.rotate(S3)

    q = Quaternion.fromAxisAngle(S2, -ang)
    const nS3 = S3.map((v) => -v) as vec.Vector3
    const n2 = q.rotate(nS3)

    return [...n1, ...n2]
}
