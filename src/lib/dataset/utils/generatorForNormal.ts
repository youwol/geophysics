import { Serie } from '@youwol/dataframe'
import { weightedSum } from '@youwol/math'
import { Data } from '../data'
import { Alpha } from '../../types'
import { generateDipAnglesInDataFrame } from './generateDipAnglesInDataFrame'
import { generateNormalInDataFrame } from './generateNormalInDataFrame'
import { generateStressMagnitudeInDataFrame } from './generateStressMagnitudeInDataFrame'
import { generateStressVectorsInDataFrame } from './generateStressVectorsInDataFrame'

/* eslint @typescript-eslint/no-explicit-any: off -- don't know how to do it */
/**
 * Generate synthetic series for {@link Data} based on `normals` (e.g., {@link JointData}, {@link ConjugateData}, {@link StyloliteData} or {@link DykeData})
 * @category Dataframe
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
        if (options?.normal || !options) {
            generateNormalInDataFrame({
                serie,
                prefix,
                suffix, // because 'plusieurs normales potentielles' (see ConjugateData)
                dataframe,
            })
        }
        if (options?.dipAngles || !options) {
            generateDipAnglesInDataFrame({
                serie,
                prefix,
                suffix, // because 'plusieurs normales potentielles' (see ConjugateData)
                dataframe,
            })
        }

        if (options?.cost || !options) {
            dataframe.series[`${prefix}cost${suffix}`] = data.costs(alpha)
        }

        if (options?.principalDirections || !options) {
            generateStressVectorsInDataFrame(
                weightedSum(data.compute, alpha),
                prefix,
                data.dataframe,
            )
        }

        if (options?.principalValues || !options) {
            generateStressMagnitudeInDataFrame(
                weightedSum(data.compute, alpha),
                prefix,
                data.dataframe,
            )
        }

        if (options?.removeSuperposition || !options) {
            data.removeSuperpositionSeries()
        }
    }

    if (Serie.isSerie(g)) {
        doit(g as Serie)
    } else {
        g.forEach((G, i) => doit(G, `${i + 1}`))
    }
}
