/**
 * Cost functions (aka, mistfit functions) and utility functions for geophysics
 */

import {
    Serie, DataFrame, apply, map
} from '@youwol/dataframe'

import { 
    add, abs, dot, normalize, square,
    div, mult, norm, negate, addNumber, mean, weightedSum,
    vec,
    minMax
} from '@youwol/math'

import { Data } from './data'
import { Alpha } from './types'

/**
 * Cost for a Gps measure (at one point)
 * 
 * <center><img style="width:60%; height:60%;" src="media://gps.png"></center>
 * <center><blockquote><i>
 * Equation for a GPS data. Upper sripts m and c stand for measured and computed, respectively
 * </i></blockquote></center>
 * 
 * @example
 * ```ts
 * const gps = new GpsData({
 *     dataframe,
 *     measure: 'gps',
 *     compute: ['u1', 'u2', 'u3'],
 *     weight: 2,
 *     weights: 'ptsWeights'
 * })
 * ```
 * @see [[Data]]
 * @see [[createData]]
 * @see [[monteCarlo]]
 * @category Geophysics
 */
export class GpsData extends Data {
    constructor(params: any) {
        super(params)
        if (this.measure.itemSize !== 3) {
            throw new Error('measure should have itemSize = 3')
        }
        this.compute.forEach( c => {
            if (c.itemSize !== 3) {
                throw new Error('compute should have itemSize = 3 (displacement)')
            }
        })
    }

    costs(data: Serie | Alpha): Serie {
        const d = this.generateData(data)
        if (d.itemSize !== 3) {
            throw new Error('provided Serie must have itemSize = 3 (displ)')
        }
        const L  = dot(this.measure, d)
        const no = norm(this.measure)
        const nc = norm(d)

        // 0.5*w*( (1-d/(no*nc))**2 + (1-no/nc)**2 )
        return mult( add([
            square(addNumber(negate( div(L, mult(no, nc)) ), 1)),
            square(addNumber(negate(div(no, nc)), 1))
        ]), 0.5)
    }

    generate(alpha: Alpha): Serie {
        return weightedSum(this.compute, alpha)
    }
}

/**
 * Cost for a vertical Gps measure (at one point)
 * 
 * <center><img style="width:25%; height:25%;" src="media://horizon.png"></center>
 * <center><blockquote><i>
 * Equation for a vertical GPS data.
 * </i></blockquote></center>
 * 
 * @example
 * ```ts
 * const gps = new VerticalGpsData({
 *     dataframe,
 *     measure: 'gps',
 *     compute: ['u1', 'u2', 'u3'],
 *     weight: 2,
 *     weights: 'ptsWeights'
 * })
 * ```
 * @see [[Data]]
 * @see [[createData]]
 * @see [[monteCarlo]]
 * @category Geophysics
 */
export class VerticalGpsData extends Data {
    constructor(params: any) {
        super(params)
        if (this.measure.itemSize !== 1) throw new Error('measure should have itemSize = 1 (displ)')
        this.compute.forEach( c => {
            if (c.itemSize !== 3) throw new Error('compute should have itemSize = 3 (displacement)')
        })
    }

    costs(data: Serie | Alpha): Serie {
        const d = this.generateData(data)
        if (d.itemSize !== 1) throw new Error('provided Serie must have itemSize = 1')
        return square(addNumber(negate(div(d, this.measure)), 1))
    }

    generate(alpha: Alpha): Serie {
        return apply( weightedSum(this.compute, alpha), item => item[2] )
    }
}

/**
 * Cost for an Insar measure (at one point)
 * @param measure The Insar measure along the satellite line of sight
 * @param compute The computed insar value along the satellite line of sight
 * @param weights Weight of the data points
 * 
 * <center><img style="width:25%; height:25%;" src="media://insar.png"></center>
 * <center><blockquote><i>
 * Equation for an Insar data. Upper sripts m and c stand for measured and computed, respectively.
 * Computed Insar is using the function [[generateInsar]], which makes use of the satellite line
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
 * @see [[Data]]
 * @see [[generateInsar]]
 * @see [[monteCarlo]]
 * @see [[createData]]
 * @category Geophysics
 */
export class InsarData extends Data {
    los: vec.Vector3 = [0,0,1]
    measuredMinMax : number[]
    normalize: boolean = false

    constructor(
        {los, dataframe, measure, compute, weights, weight, normalize}:
        {los: vec.Vector3, dataframe: DataFrame, measure: string, compute: string[], weights?: string, weight?: number, normalize?: boolean} )
    {
        super({dataframe, measure, compute, weights, weight})

        if (normalize !== undefined) this.normalize = normalize

        if (this.measure.itemSize !== 1) {
            throw new Error('measure should have itemSize = 1')
        }

        if (los === undefined) {
            throw new Error('missing line of sight (los) in InsarData')
        }

        if (this.normalize) {
            this.measuredMinMax = minMax(this.measure)
            this.measure = div(this.measure, Math.abs(this.measuredMinMax[1]-this.measuredMinMax[0]))
        }

        this.compute.forEach( c => {
            if (c.itemSize !== 3) throw new Error('compute should have itemSize = 3 (displacement)')
        })

        this.los = vec.normalize(los) as vec.Vector3
    }

    costs(alpha: Serie | Alpha): Serie {
        let d = this.generateData(alpha)
        if (d.itemSize !== 1) throw new Error('provided Serie must have itemSize = 1 (displ along los)')

        if (this.normalize) {
            const computedMinMax = minMax(d)
            d = div(d, Math.abs(computedMinMax[1]-computedMinMax[0]))
        }
        
        const m = this.measure

        //const u = map([m, d], ([i1, i2]) => Math.abs(i1)>Math.abs(i2) ? (1-i2/i1)/2 : (1-i1/i2)/2 )
        //return square(u)

        return square( map([m, d], ([i1, i2]) => i1-i2 ) )
    }

    generate(alpha: Alpha): Serie {
        return generateInsar(weightedSum(this.compute, alpha), this.los)
    }
}

/**
 * Given a displacement field and a satellite line of sight, compute the 
 * corresponding Insar data.
 * @param displ The displacement field as a flat array
 * @param satellite The satellite line of sight
 * @see [[InsarData]]
 * @example
 * In the following example, the displacement field `displ` is computed using
 * numerically, and the `measuredInsar` are the measures (observations).
 * The size of `displ` is three times the size of `insar`.
 * ```ts
 * const computedInsar = generateInsar(displ, [0.01, -0.1, -0.9856])
 * const measuredInsar = [...]
 * 
 * // Let use a loop instead of the Array.redure method
 * const cost = 0
 * for (let i=0; i<computedInsar.length; ++i) {
 *     cost += costInsar(computedInsar[i], measuredInsar[i])
 * }
 * cost /= computedInsar.length
 * ```
 * @see [[Data]]
 * @category Geophysics
 */
export function generateInsar(displ: Serie, satellite: vec.Vector3): Serie {
    return dot(displ, satellite)
}

/**
 * Generate fringes given fringe spacing.
 * @param serie The serie with itemSize of 1
 * @param fringeSpacing The spacing of the fringes
 * @returns A new [[Serie]]
 * @example
 * ```ts
 * const displ   = dataframe.series['Displ']
 * const fringes = generateFringes( generateInsar(displ, [0,0,-1]), 0.01)
 * ```
 */
export function generateFringes(serie: Serie, fringeSpacing: number): Serie {
    if (serie.itemSize !== 1) {
        throw new Error('Serie must have itemSize = 1')
    }
    const frac = (val: number) => val - Math.floor(val)
    return apply(serie, v => Math.abs(fringeSpacing*frac(v/fringeSpacing)) )
}


// export function costGps(
//     {measure, compute, weights, ...others}:
//     {measure: ASerie, compute: ASerie, weights?: ASerie}
//     //obs: ASerie, calc: ASerie, w = 1
// ): number {
//     if (measure === undefined)  throw new Error('measure is undefined')
//     if (compute === undefined)  throw new Error('compute is undefined')
//     if (measure.itemSize !== 3) throw new Error('measure should have itemSize = 3')
//     if (compute.itemSize !== 3) throw new Error('compute should have itemSize = 3')
    
//     const d  = dot(measure, compute)
//     const no = norm(measure)
//     const nc = norm(compute)

//     // 0.5*w*( (1-d/(no*nc))**2 + (1-no/nc)**2 )
//     return mean(mult( add([
//         square(addNumber(negate( div(d, mult(no, nc)) ), 1)),
//         square(addNumber(negate(div(no, nc)), 1))
//     ]), 0.5) ) as number
// }

// export function costInsar(
//     {measure, compute, weights, ...others}:
//     {measure: Serie, compute: Serie, weights?: Serie}
// ): number {
//     // w*(1 - Math.abs(calc/obs))**2
//     return mean( square(addNumber(negate(abs(div(compute, measure))), 1)) ) as number
// }
// export function costVerticalGps(
//     {measure, compute, weights, ...others}:
//     {measure: ASerie, compute: ASerie, weights?: ASerie}
// ): number {
//     // w*(1-calc/obs)**2
//     return mean( square(addNumber(negate(div(compute, measure)), 1)) ) as number
// }
