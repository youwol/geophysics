import { Serie } from '@youwol/dataframe'

/**
 * Interface for any cost function
 * @param options The arguments of the function
 * @param options.measure The measure as a Serie
 * @param options.compute The computed attribute as a Serie
 * @param options.w The weight of the measure
 * @param options.weights The weight of each point in the measure
 * @param options.others Optional other parameters
 */
export interface CostFunction {
    ({
        measure,
        compute,
        w,
        weights,
        ...others
    }: {
        measure: Serie
        compute: Serie
        w?: number
        weights?: Serie
        others?: object
    }): number
}

/**
 * @brief Alpha vector which can be of any size. This is essentially a renaming
 * in order to match [this publication](https://www.sciencedirect.com/science/article/abs/pii/S0040195116000731)
 */
export type Alpha = number[]

export type UserAlpha = number[]
