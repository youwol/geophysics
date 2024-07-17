import { DataFrame, Serie } from '@youwol/dataframe'
import { AnglesToNormal } from '@youwol/geometry'

/**
 * Generate the dip angle and dip azimuth angle in a dataframe according to the given normals.
 * @category Dataframe
 */
export function generateDipAnglesInDataFrame({
    normals,
    dataframe,
    dipName = 'dip',
    dipAzimName = 'dipAzim'
}: {
    normals: Serie,
    dataframe: DataFrame,
    dipName?: string,
    dipAzimName?: string
}) {
    // const n = serie

    const a = new AnglesToNormal()
    dataframe.series[dipAzimName] = normals.map((n) => {
        a.setNormal(n)
        return a.dipAzimuth
    })
    dataframe.series[dipName] = normals.map((n) => {
        a.setNormal(n)
        return a.dipAngle
    })
}
