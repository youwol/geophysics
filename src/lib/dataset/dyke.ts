import { Serie } from '@youwol/dataframe'
import { generateJoint } from '.'
import { JointData } from './joint'

export class DykeData extends JointData {
    name() {
        return 'DykeData'
    }
}

/**
 * Generate dikes from stress data. This is essentially the same as {@link generateJoint}.
 * A dike is represented by its normal
 * @example
 * ```ts
 * const dikes = geop.generateDikes({
 *      stress: computedStressSerie,
 *      projected: false
 * })
 * ```
 * @see {@link generateJoint}
 * @see {@link JointData}
 * @category Dataframe
 */
export function generateDike({
    stress,
    projected = false,
}: {
    stress: Serie
    projected?: boolean
}): Serie {
    return generateJoint({ stress, projected })
}
