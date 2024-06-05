import { DataFrame, Serie } from '@youwol/dataframe'

/**
 * @category Dataframe
 */
export function generateNormalInDataFrame({
    serie,
    prefix,
    suffix,
    dataframe,
}: {
    serie: Serie
    prefix: string
    suffix: string
    dataframe: DataFrame
}) {
    dataframe.series[prefix + `n${suffix}`] = serie
}
