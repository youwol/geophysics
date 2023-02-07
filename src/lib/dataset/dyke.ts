import { Serie } from '@youwol/dataframe'
import { generateJoints } from '.'
import { JointData } from './joint'

export class DykeData extends JointData {
    name() {
        return 'DykeData'
    }
}

/**
 * Generate dikes from stress data. This is essentially the same as {@link generateJoints}.
 * A dike is represented by its normal
 * @example
 * ```ts
 * const dikes = geop.generateDikes({
 *      stress: computedStressSerie,
 *      projected: false
 * })
 * ```
 * @see {@link generateJoints}
 * @see {@link JointData}
 * @category Geology
 */
export function generateDikes({
    stress,
    projected = false,
}: {
    stress: Serie
    projected?: boolean
}): Serie {
    return generateJoints({ stress, projected })
}
