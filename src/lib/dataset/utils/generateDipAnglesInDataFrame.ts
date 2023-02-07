import { DataFrame, Serie } from '@youwol/dataframe'
import { AnglesToNormal } from '@youwol/geometry'

export function generateDipAnglesInDataFrame({
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
    // const n = serie

    const a = new AnglesToNormal()
    dataframe.series[prefix + `dip${suffix}`] = serie.map((n) => {
        a.setNormal(n)
        return a.dipAngle
    })
    dataframe.series[prefix + `dipAzim${suffix}`] = serie.map((n) => {
        a.setNormal(n)
        return a.dipAzimuth
    })
}
