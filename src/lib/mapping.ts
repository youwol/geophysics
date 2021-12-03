/**
 * Using the prinicipal of superposition to perform fast computations requires
 * a vector of weights (called alpha). Most of the time the user wants to use the
 * weights in his own space, and therefore the need to map from the user-defined to the
 * needed space.
 * @module mapping
 */

import { Alpha } from "./types"

export interface alphaMapping {
    /**
     * @brief A mapping for any [[Alpha]]. Basically, it transforms a user-defined
     * alpha to a global one that can be used by superposition.
     * @param alpha The user-defined alpha vector
     * @returns The converted alpha vector
     */
    (alpha: Alpha): Alpha
}

/**
 * @brief Parameters for defining [[Alpha]], i.e., the min/max of each value as well
 * as an optional [[alphaMapping]] which allows to convert a user-defined parameter space to the
 * global one. For stochastic smulation, parameters will be sampled in these ranges.
 * @example
 * ```ts
 * // First parameters is theta in [0°, 180°]
 * // Second parameter is stress ratio in [0, 3]
 * const parameters = { 
 *     mapping: new SimpleAndersonMapping,
 *     min: [  0, 0],
 *     max: [180, 3]
 * }
 * ```
 */
export type AlphaParameters = {
    min: number[],
    max: number[],
    mapping?: alphaMapping
}

/**
 * A default mapping for any [[Alpha]]. Basically it return the same alpha.
 * @see [[alphaMapping]]
 */
export const defaultMapping: alphaMapping = (params: Alpha) => params

/**
 * @brief Convert the regional Andersonian stress (theta, R) into the global CSys [xx, xy, yy].
 * Basically, this fonction convert a non-linear space into a linear one in order to be
 * used by the superposition. This regional stress is not defined with gradient.
 * @param alpha In the form [theta, R], with theta the angle in degrees of the maximum principal horizontal
 * stress according to the north and clock wize and defined in the range [0..180], R the extended
 * stress ratio in [0..3].
 * 
 * For instance:
 * <ul>
 *   <li>if R ∈ [0..1], then it is a normal fault regime
 *   <li>if R ∈ [1..2], then it is a strike slip fault regime
 *   <li>if R ∈ [2..3], then it is a reverse fault regime
 * </ul>
 * @see [[alphaMapping]]
 * @see publication <br>
 * `Maerten, F., Madden, E. H., Pollard, D. D., & Maerten, L. (2016). Incorporating fault mechanics into inversions of aftershock data for the regional remote stress, with application to the 1992 Landers, California earthquake. Tectonophysics, 674, 52-64.`
 */
export const simpleAndersonMapping: alphaMapping = (alpha: Alpha): Alpha => {
    const theta = alpha[0]
    const R     = alpha[1]

    if (theta<0 || theta>180) throw new Error('Theta must be in [0°..180°]')
    if (R<0 || R>3) throw new Error('R must be in [0..3]')

    const c   = Math.cos(theta*Math.PI/180)
    const s   = Math.sin(theta*Math.PI/180)
    const c2  = c**2
    const s2  = s**2

    if (R <= 1) return [-c2+(R-1)*s2, R*c*s, -s2+(R-1)*c2]
    if (R <= 2) return [-R*c2+(1-R)*s2, c*s, -R*s2+(1-R)*c2]
    return [R*c2+s2, (1-R)*c*s, R*s2+c2]
}

/**
 * Transform the user-parameter-space `[theta, Rh, RH, rockDensity, cavityDensity, shift1, shift2...]`
 * to the global one `[Sxx, Sxy, Syy, Szz, density, shift1, shift2...]`, where theta is the orientation
 * of the maximum principal horizontal stress according to the north, clock-wize and in `[0..180]`,
 * Rh is the ratio of Sigma_h/Sigma_v, RH is the ratio of Sigma_H/Sigma_v, and the shifts are the pressure
 * shift of the cavity at `z=0`.
 * 
 * Note that this regional stress and the pressure use the gradient and that you can provide as many
 * shift pressures as necessary (as long as the number of linearly independent simulations are
 * computed)
 * @param alpha The user-define parameter space
 * @see [[alphaMapping]]
 * @returns `[Sxx, Sxy, Syy, Szz, cavityDensity, shift1, shift2...]`
 * @example
 * ```ts
 * // provide 2 pressure shifts
 * const alpha = GradientPressureMapping([45, 0.1, 0.2, 2300, 2200, -1e6, -1e7])
 * ```
 */
export const gradientPressureMapping: alphaMapping = (alpha: Alpha): Alpha => {
    if (alpha.length < 6) throw new Error(`argument alpha should be of size greater or equal to 6:
        alpha = [theta, Rh, RH, rockDensity, cavityDensity, shift1, shift2, ...]`) ;
    
    // if (alpha[1] > alpha[2]) {
    //     throw new Error('Rh is greater than RH')
    // }

    let theta = alpha[0]
    if (theta<0 || theta>180) throw new Error('Theta must be in [0°..180°]')
    theta = theta*Math.PI/180
    const Kh    = alpha[1]
    const KH    = alpha[2]
    const rock  = alpha[3]
    const magma = alpha[4]
    const shifts = [...alpha].splice(5)

    const cos   = Math.cos(theta)
    const sin   = Math.sin(theta)
    const cos2  = cos*cos
    const sin2  = sin*sin
    const Sv    = -rock * 9.81
    const xx    = (Kh*cos2 + KH*sin2)*Sv
    const xy    =  -((Kh-KH)*cos*sin)*Sv
    const yy    = (Kh*sin2 + KH*cos2)*Sv
    const zz    = Sv

    //console.log([xx, xy, yy, zz, magma, ...shifts])
    return [xx, xy, yy, zz, magma, ...shifts]
}
