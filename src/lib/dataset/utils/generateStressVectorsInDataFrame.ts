import { DataFrame, Serie } from '@youwol/dataframe'
import { eigenVector } from '@youwol/math'

/**
 * @category Dataframe
 */
export function generateStressVectorsInDataFrame(
    stress: Serie,
    prefix: string,
    dataframe: DataFrame,
) {
    const vectors = eigenVector(stress)
    dataframe.series[prefix + 'S1'] = vectors.map((v) => [v[0], v[1], v[2]])
    dataframe.series[prefix + 'S2'] = vectors.map((v) => [v[3], v[4], v[5]])
    dataframe.series[prefix + 'S3'] = vectors.map((v) => [v[6], v[7], v[8]])
}
