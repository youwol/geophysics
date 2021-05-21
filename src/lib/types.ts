import { Serie, DataFrame } from "@youwol/dataframe"

/**
 * Interface for any cost function
 */
export interface CostFunction {
    ({measure, compute, w, weights, ...others}:
     {measure: Serie, compute: Serie, w?: number, weights?: Serie, others?: any}): number
}

/**
 * Interface for a data that comprises the measurement (name of in the dataframe) and the weights
 * of the measurements, the associated cost function, the name of the series in order to perform
 * the superposition, and the dataframe itself
 * @example
 * ```ts
 * import { costInsar } from '@youwol/geophysics
 * import { DataFrame } from '@youwol/dataframe
 * 
 * const df = new DataFrame({
 *     d1: createSerie(...),
 *     d2: createSerie(...),
 *     d3: createSerie(...),
 *     insar: createSerie(...),
 * })
 * 
 * const insarData = {
 *     dataframe: df,
 *     measure  : 'insar',
 *     compute  : ['d1', 'd2', 'd3'],
 *     cost     : costInsar
 * }
 * ```
 */
// export type Data = {
//     /**
//      * The dataframe supporting all series (measures, weights and calculus) for
//      * a given type of data
//      */
//     dataframe: DataFrame,
//     /**
//      * The name of the serie for the measures (must be in the dataframe)
//      */
//     measure: string,
//     /**
//      * The name of the serie for the measures weight. When used, each point should
//      * have a weight (number). This parameter can be skipped
//      */
//     weights?: string,
//     /**
//      * The names of the series to perform superposition (all must be in the dataframe)
//      */
//     compute: string[],
//     /**
//      * The associated cost function
//      */
//     cost: CostFunction,
//     /**
//      * The weight of this data. Default value is 1
//      */
//     weight?: number,
//     /**
//      * Any user information (e.g., the satellite line of sight for Insar data)
//      */
//     userInfo?: any
// }

/**
 * @brief Alpha vector which can be of any size. This is essentially a renaming
 * in order to match [this publication](https://www.sciencedirect.com/science/article/abs/pii/S0040195116000731)
 */
export type Alpha = number[]

