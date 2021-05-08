import { ASerie, DataFrame } from "@youwol/dataframe"

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
    /**
     * The dataframe supporting all series (measures and calculus)
     */
    dataframe: DataFrame,
    /**
     * The name of the serie for the measures (must be in the dataframe)
     */
    measure  : string,
    /**
     * The names of the series to perform superpposition (must be in the dataframe)
     */
    calculus : string[],
    /**
     * The associated cost function
     */
    cost     : CostFunction,
    /**
     * The weight of this data
     */
    weight   : number
}

/**
 * @brief Alpha vector which can be of any size. This is essentially a renaming
 * in order to match [this publication](https://www.sciencedirect.com/science/article/abs/pii/S0040195116000731)
 */
export type Alpha = number[]

