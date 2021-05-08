import { AlphaParameters } from "./mapping"
import { Data } from "./types"

/**
 * @brief Parameters for the inversion, which are the measured and the calculated
 * data along with their associated cost function and weight. The [[AlphaParameters]]
 * has to be provided as well with the number of iterations for the inversion algorithm.
 */
export type InversionModel = {
    /**
     * All the provided [[Data]] to perform the inversion
     */
    data: Data[]
    /**
     * The parameter space to use with the mapping if necessary
     */
    alphaParameters: AlphaParameters
}

/**
 * @brief The inversion solution
 */
export type InversionResult = {
    /**
     * The inverted [[Alpha]] parameters
     */
    alpha: number[],
    /**
     * The corresponding inverted user parameters (inverse mapping)
     */
    user : number[],
    /**
     * The best cost from inversion
     */
    cost : number
}
