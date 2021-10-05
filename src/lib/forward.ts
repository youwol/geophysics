import { Serie, DataFrame } from '@youwol/dataframe'
import { weightedSum } from '@youwol/math'
import { Alpha } from './types'

export namespace forward {

    /**
     * Compute an attribute by superposition given some predefined simulations
     * @param simulations The dataframe containing al the necessary simulations
     * @param alpha The [[Alpha]] parameter to perform the linear combination
     * @param name The prefix of the series in the [[Dataframe]]
     * @param startIndex The starting index which concatenate to the name gives the
     * name of the first [[Serie]]. Default value is 1
     * @returns A new [[Serie]] which is the linear combination of the provided series
     * @example
     * ```ts
     * import { DataFrame, Serie } from '@youwol/dataframe'
     * import { simpleAndersonMapping, forward } from '@youwol/geophysics'
     * 
     * let df = DataFrame.create({
     *      series: {
     *          'toto2': Serie.create({array: ..., itemSize: 3}),
     *          'toto3': Serie.create({array: ..., itemSize: 3}),
     *          'toto4': Serie.create({array: ..., itemSize: 3})
     *      }
     * })
     * 
     * const a = forward.attribute({
     *      simulations: df,
     *      alpha      : simpleAndersonMapping([45, 1.2]),
     *      name       : 'toto',
     *      startIndex : 2
     * })
     * ```
     */
    export function attribute(
        {simulations, alpha, name, startIndex=1}:
        {simulations: DataFrame, alpha: Alpha, name: string, startIndex?: number}): Serie
    {
        const n = alpha.length
        const series: Serie[] = []
        for (let i=startIndex; i<startIndex+n; ++i) {
            const serie = simulations.series[`${name}${i}`]
            if (serie === undefined) {
                throw new Error(`Serie named ${name}${i} is missing in the dataframe`)
            }
            series.push(serie)
        }
        return weightedSum(series, alpha)
    }

}
