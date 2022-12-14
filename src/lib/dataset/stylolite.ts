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
import { JointData } from '.'

import { Data } from '../data'
import { Alpha } from '../types'

/**
 * Cost for stylolite fractures. Recall that the stresses from simulations are in
 * engineer convention. A stylolite is represented by its normal.
 * @see [[JointData]]
 * @see [[monteCarlo]]
 * @see [[createData]]
 *
 * <center><img style="width:40%; height:40%;" src="media://stylolite.png"></center>
 * <center><blockquote><i>
 * Relation between a stylolite and the three principales stresses
 * </i></blockquote></center>
 *
 * @category Geology
 */
export class StyloliteData extends JointData {
    name() {
        return 'StyloliteData'
    }

    generate(alpha: Alpha): Serie {
        return generateStylolites({
            stress: weightedSum(this.compute, alpha),
            projected: this.projected,
        })
    }
}

/**
 * Generate stylolites from stress data. A stylolite is represented by its normal
 * @example
 * ```ts
 * const data = geop.generateStylolites({
 *      stress: computedStressSerie,
 *      projected: true
 * })
 * ```
 * @see [[generateJoints]]
 * @category Geology
 */
export function generateStylolites({
    stress,
    projected = false,
}: {
    stress: Serie
    projected?: boolean
}): Serie {
    const ns = eigenVector(stress).map((v) => [v[6], v[7], v[8]]) // SIGMA-1 for engineers

    if (projected) {
        return normalize(apply(ns, (n) => [n[0], n[1], 0]))
    }

    return ns
}
