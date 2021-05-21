/**
 * Cost functions (aka, mistfit functions) and utility functions for geophysics
 */
// import {
//     abs, add, addNumber, ASerie, div, dot, mult,
//     negate, norm, square, mean, weightedSum, DataFrame, apply
// } from '@youwol/dataframe'

// import { Vector3, normalize } from '@youwol/math'
import {
    Serie, DataFrame, apply
} from '@youwol/dataframe'

import { 
    add, abs, dot, normalize, square,
    div, mult, norm, negate, addNumber, mean, weightedSum,
    vec
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
        if (this.measure.itemSize !== 3) throw new Error('measure should have itemSize = 3')
        this.compute.forEach( c => {
            if (c.itemSize !== 3) throw new Error('compute should have itemSize = 3 (displacement)')
        })
    }

    cost(alpha: Alpha): number {
        const compute = weightedSum(this.compute, alpha)
        const d  = dot(this.measure, compute)
        const no = norm(this.measure)
        const nc = norm(compute)

        // 0.5*w*( (1-d/(no*nc))**2 + (1-no/nc)**2 )
        return mean(mult( add([
            square(addNumber(negate( div(d, mult(no, nc)) ), 1)),
            square(addNumber(negate(div(no, nc)), 1))
        ]), 0.5) ) as number
    }

    generate(alpha: Alpha): Serie {
        return weightedSum(this.compute, alpha)
    }
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
        if (this.measure.itemSize !== 1) throw new Error('measure should have itemSize = 1')
        this.compute.forEach( c => {
            if (c.itemSize !== 3) throw new Error('compute should have itemSize = 3 (displacement)')
        })
    }

    cost(alpha: Alpha): number {
        const compute = weightedSum(this.compute, alpha)
        return mean( square(addNumber(negate(div(compute, this.measure)), 1)) ) as number
    }

    generate(alpha: Alpha): Serie {
        return apply( weightedSum(this.compute, alpha), item => item[2] )
    }
}

// export function costVerticalGps(
//     {measure, compute, weights, ...others}:
//     {measure: ASerie, compute: ASerie, weights?: ASerie}
// ): number {
//     // w*(1-calc/obs)**2
//     return mean( square(addNumber(negate(div(compute, measure)), 1)) ) as number
// }

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

    constructor(
        {los, dataframe, measure, compute, weights, weight}:
        {los: vec.Vector3, dataframe: DataFrame, measure: string, compute: string[], weights?: string, weight?: number} )
    {
        super({dataframe, measure, compute, weights, weight})

        if (this.measure.itemSize !== 1) throw new Error('measure should have itemSize = 1')
        this.compute.forEach( c => {
            if (c.itemSize !== 3) throw new Error('compute should have itemSize = 3 (displacement)')
        })
        this.los = vec.normalize(los) as vec.Vector3
    }

    cost(alpha: Alpha): number {
        const compute = generateInsar(weightedSum(this.compute, alpha), this.los)
        return mean( square(addNumber(negate(abs(div(compute, this.measure))), 1)) ) as number
    }

    generate(alpha: Alpha): Serie {
        return generateInsar(weightedSum(this.compute, alpha), this.los)
    }
}

// export function costInsar(
//     {measure, compute, weights, ...others}:
//     {measure: Serie, compute: Serie, weights?: Serie}
// ): number {
//     // w*(1 - Math.abs(calc/obs))**2
//     return mean( square(addNumber(negate(abs(div(compute, measure))), 1)) ) as number
// }


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
    // displ.map( u => u[0]*satellite[0] + u[1]*satellite[1] + u[2]*satellite[2] )
    return dot(displ, satellite)
}
