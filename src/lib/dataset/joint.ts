import { Serie, DataFrame, apply } from '@youwol/dataframe'

import {
    eigenVector,
    abs,
    dot,
    normalize,
    square,
    div,
    sub,
    weightedSum,
} from '@youwol/math'

import { Data } from '../data'
import { Alpha } from '../types'

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
 * @see [[Data]]
 * @see [[monteCarlo]]
 * @see [[createData]]
 * @category Geology
 */
export class JointData extends Data {
    protected useNormals = true
    protected useAngle = true
    protected projected = false

    constructor({
        dataframe,
        measure,
        compute,
        weights,
        weight,
        useNormals = true,
        projected = false,
        useAngle = true,
    }: {
        dataframe: DataFrame
        measure: string
        compute?: string[]
        weights?: string
        weight?: number
        useNormals?: boolean
        projected?: boolean
        useAngle?: boolean
    }) {
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
                const l = Math.sqrt(x ** 2 + y ** 2)
                return [x / l, y / l, 0]
            })
        }
    }

    name() {
        return 'JointData'
    }

    costs(data: Serie | Alpha): Serie {
        const d = this.generateData(data)
        if (d.itemSize !== 3)
            throw new Error(
                'generateData must have itemSize = 3 (normals to the planes)',
            )
        if (this.useAngle) {
            if (this.weights) {
                const W = 2 / Math.PI / this.sumWeights
                //return div(dot(this.measure, d), this.weights).map( v => Math.acos(Math.abs(v))*W )
                return dot(this.measure, d).map((v, i) => {
                    const w = this.weights.itemAt(i) as number
                    return (Math.acos(Math.abs(v)) * W) / w
                })
            } else {
                const W = 2 / Math.PI
                return dot(this.measure, d).map((v, i) => {
                    const a = Math.abs(v)
                    return Math.acos(a > 1 ? 1 : a) * W
                })
            }
        } else {
            // (1-|d|)^2
            const s = square(sub(abs(dot(this.measure, d)), 1))
            if (this.weights) {
                // sum(cost_i/w_i)/sum(1/w_i) = sum(cost_i/w_i)/sumWeights => 2 div
                return div(div(s, this.weights), this.sumWeights)
            } else {
                return s

                // DOES NOT WORK §yet?)
                //this.measure.dot(d).abs().sub(1).square()
            }
        }
    }

    generate(alpha: Alpha): Serie {
        return generateJoints({
            stress: weightedSum(this.compute, alpha),
            projected: this.projected,
        })
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
 * @see [[JointData]]
 * @category Geology
 */
export function generateJoints({
    stress,
    projected = false,
}: {
    stress: Serie
    projected?: boolean
}): Serie {
    const ns = eigenVector(stress).map((v) => [v[0], v[1], v[2]]) // SIGMA-1 for engineers

    if (projected) {
        return normalize(
            apply(ns, (n) => {
                const x = n[0]
                const y = n[1]
                const l = Math.sqrt(x ** 2 + y ** 2)
                return [x / l, y / l, 0]
                // [n[0], n[1], 0]
            }),
        )
    }
    return ns
}
