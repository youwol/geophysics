import { Serie } from '@youwol/dataframe'

/**
 * Interface for any cost function
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
