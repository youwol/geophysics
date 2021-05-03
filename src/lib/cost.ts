import { ASerie, weight, DataFrame } from "../../../dataframe/src/lib"
import { Alpha } from "./alpha"

/**
 * Interface for any cost function
 */
 export interface CostFunction {
    (measured: ASerie, computed: ASerie, ...others: any[]): number
}

/**
 * Interface for a data that comprises the measurement (name of in the dataframe), the associated
 * cost function, the name of the series in order to perform the superposition, and the
 * dataframe itself
 */
 export type Data = {
    dataframe: DataFrame,
    measure  : string,
    calculus : string[],
    cost     : CostFunction,
    weight   : number
}

/**
 * Compute the associated cost to alpha given an array of [[Data]].
 * @note When data is an array, the resulting weighted costs.
 * Otherwise, the returned cost (not multipled by the weight of the data).
 * @category Inversion
 */
 export const cost = (data: Data | Data[], alpha: Alpha): number => {
    if (Array.isArray(data)) {
        let w = 0
        console.warn('really check that w is update before returning')
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
