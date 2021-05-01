/**
 * Cost functions (aka, mistfit functions) and utility functions for geophysics
 */
import { abs, add, ASerie, div, dot, mult, negate, norm, square } from '../../../dataframe/src/lib'
import * as math from '../../../math/src/lib'

/**
 * Cost for a Gps measure (at one point)
 * @param obs The measure gps vector
 * @param u The computed displacement vector
 * @param w Weight with default value 1
 * 
 * <center><img style="width:60%; height:60%;" src="media://gps.png"></center>
 * <center><blockquote><i>
 * Equation for a GPS data. Upper sripts m and c stand for measured and computed, respectively
 * </i></blockquote></center>
 * 
 * @category Geophysics
 */
export function costGps(obs: ASerie, calc: ASerie, w = 1): ASerie {
    if (obs === undefined) throw new Error('obs is undefined')
    if (calc === undefined) throw new Error('calc is undefined')
    if (obs.itemSize !== 3) throw new Error('obs should have itemSize = 3')
    if (calc.itemSize !== 3) throw new Error('calc should have itemSize = 3')
    const d  = dot(obs, calc)
    const no = norm(obs)
    const nc = norm(calc)

    // 0.5*w*( (1-d/(no*nc))**2 + (1-no/nc)**2 )
    return mult( add(
        add(negate( div(d, square(mult(no, nc))) ), 1),
        square(add(negate(div(no, nc)), 1))
    ), 0.5*w)
}

/**
 * Cost for a vertical Gps measure (at one point)
 * @param obs The measure vertical gps value
 * @param u The computed vertical displacement value
 * @param w Weight with default value 1
 * @example
 * ```ts
 * const displ   = computDispl() // user function
 * const horizon = [...] // set of 3D points in a flat array
 * 
 * // Get the fitting plane for the horizon
 * const plane = fittingPlane(horizon)
 * 
 * // and compute the cost
 * let cost = 0
 * for (let i=0; i<horizon.length; i+=3) {
 *     const p = [horizon[i], horizon[i+1], horizon[i+2]]
 *     const d = distanceFromPointToPlane(p, plane)
 *     cost += costVerticalGps(p, d, 1)
 * }
 * cost /= horizon.length/3
 * ```
 * 
 * <center><img style="width:25%; height:25%;" src="media://horizon.png"></center>
 * <center><blockquote><i>
 * Equation for a vertical GPS data.
 * </i></blockquote></center>
 * 
 * @category Geophysics
 */
export function costVerticalGps(obs: ASerie, calc: ASerie, w = 1): ASerie {
    // w*(1-calc/obs)**2
    return mult(square(add(negate(div(calc, obs)), 1)), w)
}

/**
 * Cost for an Insar measure (at one point)
 * @param obs The Insar measure along the satellite line of sight
 * @param d The computed insar value along the satellite line of sight
 * @param w Weight with default value 1
 * @see [[generateInsar]]
 * 
 * <center><img style="width:25%; height:25%;" src="media://insar.png"></center>
 * <center><blockquote><i>
 * Equation for an Insar data. Upper sripts m and c stand for measured and computed, respectively.
 * Computed Insar is using the function [[generateInsar]], which makes use of the satellite line
 * of sight.
 * </i></blockquote></center>
 * 
 * @category Geophysics
 */
export function costInsar(obs: ASerie, calc: ASerie, w = 1): ASerie {
    // w*(1 - Math.abs(calc/obs))**2
    return mult(square(add(negate(abs(div(calc, obs))), 1)), w)
}

/**
 * Given a displacement field and a satellite line of sight, compute the 
 * corresponding Insar data.
 * @param displ The displacement field as a flat array
 * @param satellite The satellite line of sight
 * @see [[costInsar]]
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
 * @category Geophysics
 */
export function generateInsar(displ: ASerie, satellite: math.Vector3): ASerie {
    // displ.map( u => u[0]*satellite[0] + u[1]*satellite[1] + u[2]*satellite[2] )
    return dot(displ, satellite)
}
