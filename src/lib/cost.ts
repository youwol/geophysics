import { weight } from "@youwol/dataframe"
import { Alpha, Data } from "./types"

/**
 * Compute the associated cost to alpha given an array of [[Data]].
 * @note When data is an array, returns the weighted cost.
 * Otherwise, returns the cost (not multipled by the weight of the data).
 */
 export const cost = (data: Data | Data[], alpha: Alpha): number => {
    if (Array.isArray(data)) {
        let w = 0
        //console.warn('really check that w is update before returning')
        return data.reduce( (acc, d) => {
            w += d.weight
            return acc + d.cost(
                d.dataframe.get(d.measure),
                weight(d.calculus.map( name => d.dataframe.get(name)), alpha)
            ) * d.weight
        }, 0) / w
    }

    const calc = weight(data.calculus.map( name => data.dataframe.get(name)), alpha)
    const meas = data.dataframe.get(data.measure)
    return data.cost(meas, calc)
}
