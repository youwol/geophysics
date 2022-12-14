import { Alpha } from './types'
import { Data } from './data'

/**
 * Compute the associated cost to alpha given a [[Data]] or an array of [[Data]].
 * @note When data is an array, returns the weighted cost.
 * Otherwise, returns the cost (not multipled by the weight of the data).
 */
export const cost = (data: Data | Data[], alpha: Alpha): number => {
    if (Array.isArray(data)) {
        let w = 0
        return (
            data.reduce((acc, d) => {
                w += d.weight
                return acc + d.cost(alpha)
            }, 0) / w
        )
    }

    return data.cost(alpha)
}
