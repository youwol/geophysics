import { Serie, DataFrame, apply } from '@youwol/dataframe'

import {
    eigenVector,
    abs,
    dot,
    square,
    div,
    sub,
    weightedSum,
} from '@youwol/math'

import { Data } from './data'
import { Alpha } from '../types'
import { generatorForNormal } from './utils/generatorForNormal'
import { normalize } from '../utils/normalizeSerie'

/**
 * Parameters for {@link JointData} or {@link DykeData} constructor
 * @category Data/Geology
 */
export type JointDataParams = {
    dataframe: DataFrame
    measure: string
    compute?: string[]
    weights?: string
    weight?: number
    useNormals?: boolean
    projected?: boolean
    useAngle?: boolean
}

/**
 * Cost for joint fractures. Recall that the stresses from simulations are in
 * engineer convention.
 *
 * If `useNormals = true` (default), then it is assumed that the provided data orientation (measure) are
 * the normal to the joints, not the joint orientation themself. Otherwise, the orientation
 * of the joints are used.
 *
 * If `projected = true`, then the measured and the computed joints are projected on the
 * horizontal. Otherwise (default), data and computation are kept in 3D.
 *
 * <center><img style="width:40%; height:40%;" src="media://joint.png"></center>
 * <center><blockquote><i>
 * Relation between a joint and the three principales stresses
 * </i></blockquote></center>
 *
 * @example
 * ```ts
 * const data = new JointData({
 *     dataframe,
 *     useNormals: true,
 *     projected : true,
 *     measure   : 'normals',
 *     compute   : ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
 *     weight    : 1,
 *     weights   : 'ptsWeights'
 * })
 * ```
 * @see {@link Data}
 * @see {@link monteCarlo}
 * @see {@link createData}
 * @category Data/Geology
 */
export class JointData extends Data {
    protected useNormals = true
    protected useAngle = true
    protected projected = false

    static clone(param: JointDataParams): Data {
        return new JointData(param)
    }

    constructor({
        dataframe,
        measure,
        compute,
        weights,
        weight,
        useNormals = true,
        projected = false,
        useAngle = true,
    }: JointDataParams) {
        super({ dataframe, measure, compute, weights, weight })
        this.measure = normalize(this.measure)
        this.useNormals = useNormals !== undefined ? useNormals : true
        this.projected = projected !== undefined ? projected : false
        this.useAngle = useAngle !== undefined ? useAngle : true

        // Project measure if necessary
        if (this.projected) {
            // this.measure = this.measure.map( v => [v[0], v[1], 0])
            this.measure = this.measure.map((v) => {
                const x = v[0]
                const y = v[1]
                let l = Math.sqrt(x ** 2 + y ** 2)
                if (l === 0) {
                    l = 1
                    console.warn(
                        `JointData ctor: measure at index i is horizontal => normalization is null`,
                        dataframe,
                    )
                }
                return [x / l, y / l, 0]
            })
        }
    }

    name() {
        return 'JointData'
    }

    costs(alpha: Serie | Alpha): Serie {
        const d = this.generateData(alpha) as Serie
        if (d.itemSize !== 3) {
            throw new Error(
                'generateData must have itemSize = 3 (normals to the planes)',
            )
        }
        if (this.useAngle) {
            if (this.weights) {
                const W = 2 / Math.PI / this.sumWeights
                return dot(this.measure, d).map((v, i) => {
                    const w = this.weights.itemAt(i) as number
                    return (Math.acos(Math.abs(v)) * W) / w
                })
            } else {
                const W = 2 / Math.PI
                return dot(this.measure, d).map((v) => {
                    const a = Math.abs(v)
                    return Math.acos(a > 1 ? 1 : a) * W
                })
            }
        } else {
            // (1-|d|)^2
            const s = square(sub(abs(dot(this.measure, d)), 1))
            if (this.weights) {
                return div(div(s, this.weights), this.sumWeights)
            } else {
                return s
            }
        }
    }

    generate(alpha: Alpha, forExport: boolean): Serie {
        return generateJoint({
            stress: weightedSum(this.compute, alpha),
            projected: forExport ? false : this.projected,
        })
    }

    /* eslint @typescript-eslint/no-explicit-any: off -- have to keep any here */

    /**
     * Generate synthetic data (same type a the measures) as well as stress magnitude.
     * Finally, remove all Series related to superposition.
     *
     * @param params All the parameters of the method
     * @param params.alpha The global weights to perform the superposition.
     * @param params.prefix The name prefix used to generate the series
     * @param params.options The optional parameters to generate series
     * @example
     * ```ts
     * data.generateInDataFrame({
     *      alpha: [1,2,3,4],
     *      prefix: 'Out',
     *      options: {
     *          cost: true,                 // If the costs should be set as a serie
     *          principalValues: true,      // If the principal values should be set as series
     *          principalDirections: false, // If the principal vectors should be set as series
     *          normal: false,              // If the normal vector should be set as a serie
     *          dipAngleAzim: true,         // If the dip-angle and dip-azimuth should be set as series
     *          removeSuperposition: true   // If teh series to perform the superposition should be removed
     *      }
     * })
     * ```
     * @note The alpha vector is NOT the user-alpha, but the result of the mapping of the
     * user-alpha (see {@link alphaMapping})
     * @see {@link alphaMapping}
     */
    generateInDataframe({
        alpha,
        prefix,
        options = undefined,
    }: {
        alpha: Alpha
        prefix: string
        options?: { [key: string]: any }
    }): void {
        generatorForNormal({ data: this, alpha, prefix, options })
    }
}

/**
 * Generate joints from stress data. A joint is represented by its normal
 * @example
 * ```ts
 * const joints = geop.generateJoints({
 *      stress: computedStressSerie,
 *      projected: true
 * })
 * ```
 * @see {@link JointData}
 * @category Dataframe
 */
export function generateJoint({
    stress,
    projected = false,
}: {
    stress: Serie
    projected?: boolean
}): Serie {

    // const ns = eigenVector(stress).map((v) => [v[0], v[1], v[2]]) // SIGMA-1 for engineers
    const ns = eigenVector(stress).map((v) => [v[6], v[7], v[8]])

    if (projected) {
        // ERROR: can normalize a [0,0,0] vector
        return normalize(
            apply(ns, (n) => {
                const x = n[0]
                const y = n[1]
                let l = Math.sqrt(x ** 2 + y ** 2)
                if (l === 0) {
                    l = 1
                }
                return [x / l, y / l, 0]
            }),
        )
    }
    return ns
}
