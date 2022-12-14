import { DataFrame, Serie } from '@youwol/dataframe'
import { vec } from '@youwol/math'

/**
 * Transform segments given by a DataFrame into points, where
 * positions are the center of each segments. Also, the normal of each segment
 * is introduced in the returned DataFrame.
 * @example
 * ```js
 * const io = require('@youwol/io')
 * const fs = require('fs')
 *
 * const text   = fs.readFileSync(filename, 'utf8')
 * const plines = io.decodeGocadPL(text)
 *
 * const results = plines.map( pline => pl2XyzWithNormals(pline) )
 * ```
 */
export function segments2PointsWithNormals(
    df: DataFrame,
    dipAngle = 90,
    normalsName = 'n',
): DataFrame {
    if (df.series.positions === undefined) return undefined
    if (df.series.indices === undefined) return undefined
    if (df.series.indices.itemSize !== 2) return undefined

    const dip = (dipAngle * Math.PI) / 180
    const COS = Math.cos(dip)
    const SIN = Math.sin(dip)

    const normals = []
    const positions = []

    df.series.indices.forEach((P) => {
        const v1 = df.series.positions.itemAt(P[0])
        const v2 = df.series.positions.itemAt(P[1])

        for (var i = 0; i < 3; ++i) {
            positions.push((v1[i] + v2[i]) / 2)
        }

        let v = vec.normalize([
            (v2[1] - v1[1]) * SIN,
            -(v2[0] - v1[0]) * SIN,
            COS,
        ])
        v = vec.normalize(v)

        normals.push(...v)
    })

    const dataframe = DataFrame.create({
        series: {
            positions: Serie.create({ array: positions, itemSize: 3 }),
        },
    })
    dataframe.series[normalsName] = Serie.create({
        array: normals,
        itemSize: 3,
    })

    return dataframe
}
