import { DataFrame, Serie } from '@youwol/dataframe'

/**
 * @category Dataframe
 */
export function generateNormalInDataFrame({
    normals,
    name='n',
    dataframe,
}: {
    normals: Serie,
    name?: string,
    dataframe: DataFrame
}) {
    dataframe.series[name] = normals
}
