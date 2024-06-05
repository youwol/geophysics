import { Serie, apply, DataFrame, map } from '@youwol/dataframe'
import { Data } from './data'
import { Alpha } from '../types'
import { dot, square, div, weightedSum, vec, minMax } from '@youwol/math'

/**
 * Cost for an Insar measure (at one point)
 * @param measure The Insar measure along the satellite line of sight
 * @param compute The computed insar value along the satellite line of sight
 * @param weights Weight of the data points
 *
 * <center><img style="width:25%; height:25%;" src="media://insar.png"></center>
 * <center><blockquote><i>
 * Equation for an Insar data. Upper sripts m and c stand for measured and computed, respectively.
 * Computed Insar is using the function {@link generateInsar}, which makes use of the satellite line
 * of sight.
 * </i></blockquote></center>
 *
 * @example
 * ```ts
 * const gps = new InsarData({
 *     los: [0,0,-1],
 *     normalize: false,
 *     dataframe,
 *     measure: 'insar',
 *     compute: ['u1', 'u2', 'u3'],
 *     weight: 1,
 *     weights: 'ptsWeights'
 * })
 * ```
 * @see {@link Data}
 * @see {@link generateInsar}
 * @see {@link monteCarlo}
 * @see {@link createData}
 * @category Data/Geophysics
 */
export class InsarData extends Data {
    los: vec.Vector3 = [0, 0, 1]
    measuredMinMax: number[]
    normalize = false

    constructor({
        los,
        dataframe,
        measure,
        compute,
        weights,
        weight,
        normalize,
    }: {
        los: vec.Vector3
        dataframe: DataFrame
        measure: string
        compute: string[]
        weights?: string
        weight?: number
        normalize?: boolean
    }) {
        super({ dataframe, measure, compute, weights, weight })

        if (normalize !== undefined) {
            this.normalize = normalize
        }

        if (this.measure.itemSize !== 1) {
            throw new Error('measure should have itemSize = 1')
        }

        if (los === undefined) {
            throw new Error('missing line of sight (los) in InsarData')
        }

        if (this.normalize) {
            this.measuredMinMax = minMax(this.measure)
            this.measure = div(
                this.measure,
                Math.abs(this.measuredMinMax[1] - this.measuredMinMax[0]),
            )
        }

        this.compute.forEach((c) => {
            if (c.itemSize !== 3) {
                throw new Error(
                    'compute should have itemSize = 3 (displacement)',
                )
            }
        })

        this.los = vec.normalize(los) as vec.Vector3
    }

    name() {
        return 'InsarData'
    }

    costs(alpha: Serie | Alpha): Serie {
        let d = this.generateData(alpha) as Serie
        if (d.itemSize !== 1) {
            throw new Error(
                'provided Serie must have itemSize = 1 (displ along los)',
            )
        }

        if (this.normalize) {
            const computedMinMax = minMax(d)
            d = div(d, Math.abs(computedMinMax[1] - computedMinMax[0]))
        }

        const m = this.measure

        //const u = map([m, d], ([i1, i2]) => Math.abs(i1)>Math.abs(i2) ? (1-i2/i1)/2 : (1-i1/i2)/2 )
        //return square(u)

        return square(map([m, d], ([i1, i2]) => i1 - i2))
    }

    generate(alpha: Alpha): Serie {
        return generateInsar({
            displ: weightedSum(this.compute, alpha),
            LOS: this.los,
        })
    }
}

/**
 * Given a displacement field and a satellite line of sight, compute the
 * corresponding Insar data.
 * @param displ The displacement field as a flat array
 * @param satellite The satellite line of sight
 * @see {@link InsarData}
 * @example
 * In the following example, the displacement field `displ` is computed using
 * numerically, and the `measuredInsar` are the measures (observations).
 * The size of `displ` is three times the size of `insar`.
 * ```ts
 * const computedInsar = generateInsar({displ, LOS: [0.01, -0.1, -0.9856]})
 * const measuredInsar = [...]
 *
 * // Let use a loop instead of the Array.redure method
 * const cost = 0
 * for (let i=0; i<computedInsar.length; ++i) {
 *     cost += costInsar(computedInsar[i], measuredInsar[i])
 * }
 * cost /= computedInsar.length
 * ```
 * @see {@link Data}
 * @category Dataframe
 */
export function generateInsar({
    displ,
    LOS,
}: {
    displ: Serie
    LOS: vec.Vector3
}): Serie {
    return dot(displ, LOS)
}

/**
 * Generate fringes given fringe spacing.
 * @param serie The serie with itemSize of 1
 * @param fringeSpacing The spacing of the fringes
 * @returns A new Serie
 * @example
 * ```ts
 * const displ   = dataframe.series['Displ']
 * const fringes = generateFringes( generateInsar({displ, LOS: [0,0,-1]}), 0.01)
 * ```
 * @category Dataframe
 */
export function generateFringes(serie: Serie, fringeSpacing: number): Serie {
    if (serie.itemSize !== 1) {
        throw new Error('Serie must have itemSize = 1')
    }
    const frac = (val: number) => val - Math.floor(val)
    return apply(serie, (v) =>
        Math.abs(fringeSpacing * frac(v / fringeSpacing)),
    )
}
