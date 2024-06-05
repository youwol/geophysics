import { DataFrame, Serie } from '@youwol/dataframe'
import { eigenValue } from '@youwol/math'

/**
 * @category Dataframe
 */
export function generateStressMagnitudeInDataFrame(
    stress: Serie,
    prefix: string,
    dataframe: DataFrame,
) {
    const values = eigenValue(stress)
    dataframe.series[prefix + 's1'] = values.map((v) => v[0])
    dataframe.series[prefix + 's2'] = values.map((v) => v[1])
    dataframe.series[prefix + 's3'] = values.map((v) => v[2])
}
