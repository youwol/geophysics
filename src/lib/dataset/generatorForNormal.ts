import { Serie } from '@youwol/dataframe'
import { weightedSum } from '@youwol/math'
import { Data } from '../data'
import { Alpha } from '../types'
import { generateDipAnglesInDataFrame } from './generateDipAnglesInDataFrame'
import { generateNormalInDataFrame } from './generateNormalInDataFrame'
import { generateStressMagnitudeInDataFrame } from './generateStressMagnitudeInDataFrame'
import { generateStressVectorsInDataFrame } from './generateStressVectorsInDataFrame'

/* eslint @typescript-eslint/no-explicit-any: off -- don't know how to do it */
/**
 * Generate synthetic series for {@link Data} based on `normals` (e.g., {@link JointData}, {@link ConjugateData}, {@link StyloliteData} or {@link DikeData})
 */
export function generatorForNormal({
    data,
    alpha,
    prefix,
    options = undefined,
}: {
    data: Data
    alpha: Alpha
    prefix: string
    options?: { [key: string]: any }
}) {
    const g = data.generate(alpha, true)
    const dataframe = data.dataframe

    const doit = (serie: Serie, suffix = '') => {
        if (
            options === undefined ||
            (options !== undefined &&
                options.normal !== undefined &&
                options.normal === true)
        ) {
            generateNormalInDataFrame({
                serie,
                prefix,
                suffix, // because 'plusieurs normales potentielles' (see CongugateData)
                dataframe,
            })
        }
        if (
            options === undefined ||
            (options !== undefined &&
                options.dipAngles !== undefined &&
                options.dipAngles === true)
        ) {
            generateDipAnglesInDataFrame({
                serie,
                prefix,
                suffix, // because 'plusieurs normales potentielles' (see CongugateData)
                dataframe,
            })
        }

        if (
            options === undefined ||
            (options !== undefined &&
                options.cost !== undefined &&
                options.cost === true)
        ) {
            dataframe.series[`${prefix}cost${suffix}`] = data.costs(alpha)
        }

        if (
            options === undefined ||
            (options !== undefined &&
                options.principalDirections !== undefined &&
                options.principalDirections === true)
        ) {
            generateStressVectorsInDataFrame(
                weightedSum(data.compute, alpha),
                prefix,
                data.dataframe,
            )
        }

        if (
            options === undefined ||
            (options !== undefined &&
                options.principalValues !== undefined &&
                options.principalValues === true)
        ) {
            generateStressMagnitudeInDataFrame(
                weightedSum(data.compute, alpha),
                prefix,
                data.dataframe,
            )
        }

        if (
            options === undefined ||
            (options !== undefined &&
                options.removeSuperposition !== undefined &&
                options.removeSuperposition === true)
        ) {
            data.removeSuperpositionSeries()
        }
    }

    if (Serie.isSerie(g)) {
        doit(g as Serie)
    } else {
        g.forEach((G, i) => doit(G, `${i + 1}`))
    }
}
