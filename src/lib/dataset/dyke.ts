import { Serie } from '@youwol/dataframe'
import { generateJoints } from '.'
import { JointData } from './joint'


export class DikeData extends JointData {
    name() {return 'DikeData'}
}

/**
 * Generate dikes from stress data. This is essentially the same as [[generateJoints]].
 * A dike is represented by its normal
 * @example
 * ```ts
 * const dikes = geop.generateDikes({
 *      stress: computedStressSerie,
 *      projected: false
 * })
 * ```
 * @see [[generateJoints]]
 * @see [[JointData]]
 * @category Geology
 */
 export function generateDikes(
    {stress, projected=false}:
    {stress: Serie, projected?: boolean}): Serie
{
    return generateJoints({stress, projected})
}