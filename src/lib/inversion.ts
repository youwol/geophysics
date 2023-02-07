import { AlphaParameters } from './mapping'
import { Data } from './dataset/data'

export type MessageCB = (msg: string) => void
export type ProgressCB = (iter: number, percent: number) => void

/**
 * @brief Parameters for the inversion, which are the measured and the calculated
 * data along with their associated cost function and weight. The {@link AlphaParameters}
 * has to be provided as well with the number of iterations for the inversion algorithm.
 */
export type InversionModel = {
    /**
     * All the provided {@link Data} to constrain the inversion
     */
    data: Data[]

    /**
     * The parameter space to use with the mapping if necessary
     */
    alpha: AlphaParameters

    /**
     * The progression callback for the method of inversion (monte-carlo, mcmc, Bees, ...)
     */
    onProgress?: ProgressCB

    /**
     * The messages callback
     */
    onMessage?: MessageCB
}

/**
 * @brief The inversion solution
 */
export type InversionResult = {
    /**
     * The inverted {@link Alpha} parameters
     */
    alpha: number[]

    /**
     * The corresponding inverted user parameters (inverse mapping).
     * If the mapping was not provided, then `user` will be equal to `alpha`
     */
    user: number[]

    /**
     * The best cost from inversion in [0, 1]. A value close to zero means a "good" inversion.
     * A value close to one means the opposite.
     */
    cost: number

    /**
     * The best fit in %. The fit is related to cost by: `fit = 100(1-cost)`
     */
    fit: number

    /**
     * The iteration where the min was detected
     */
    iteration: number

    /**
     * The max number of iterations
     */
    maxIteration: number
}
