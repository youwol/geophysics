import { Alpha } from './types'
import { Data } from './dataset/data'

/**
 * Compute the associated cost according to a given alpha (not a UserAlpha) given
 * a {@link Data} or an array of {@link Data}.
 * @note When data is an array, returns the weighted cost.
 * Otherwise, returns the cost (not multipled by the weight of the data).
 * @note In order to use Alpha, you can use the appropriate mapping which translate
 * your UserAlpha to Alpha (see {@link alphaMapping})
 * @category Utils
 */
export const cost = (data: Data | Data[], alpha: Alpha): number => {
    if (Array.isArray(data)) {
        return (
            data.reduce((acc, d) => acc + d.cost(alpha), 0) /
            data.reduce((acc, d) => acc + d.weight, 0)
        )
    }

    return data.cost(alpha)
}
