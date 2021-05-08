import { ASerie, DataFrame } from "@youwol/dataframe"

/**
 * Interface for any cost function
 */
export interface CostFunction {
    ({measure, compute, w, weights, ...others}:
     {measure: ASerie, compute: ASerie, w?: number, weights?: ASerie}): number
}

/**
 * Interface for a data that comprises the measurement (name of in the dataframe) and the weights
 * of the measurements, the associated cost function, the name of the series in order to perform
 * the superposition, and the dataframe itself
 */
export type Data = {
    /**
     * The dataframe supporting all series (measures, weights and calculus) for
     * a given type of data
     */
    dataframe: DataFrame,
    /**
     * The name of the serie for the measures (must be in the dataframe)
     */
    measure  : string,
    /**
     * The name of the serie for the measures weight. When used, each point should
     * have a weight (number). This parameter can be skipped
     */
    weights?: string,
    /**
     * The names of the series to perform superpposition (must be in the dataframe)
     */
    calculus : string[],
    /**
     * The associated cost function
     */
    cost     : CostFunction,
    /**
     * The weight of this data. Default value is 1
     */
    weight?  : number
}

/**
 * @brief Alpha vector which can be of any size. This is essentially a renaming
 * in order to match [this publication](https://www.sciencedirect.com/science/article/abs/pii/S0040195116000731)
 */
export type Alpha = number[]

