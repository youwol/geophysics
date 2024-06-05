/**
 * Using the principal of superposition to perform fast computations requires
 * a vector of weights (called alpha). Most of the time the user wants to use the
 * weights in his own space, and therefore the need to map from the user-defined to the
 * needed space.
 * @module mapping
 */

import { Alpha, UserAlpha } from './types'
import { deg2rad } from './utils'

/**
 * @category Mapping
 */
export namespace MappingFactory {
    const map_: Map<string, alphaMapping> = new Map()

    export const bind = (obj: alphaMapping, name: string = '') => {
        name.length === 0 ? map_.set(obj.name, obj) : map_.set(name, obj)
    }

    export const resolve = (name: string): alphaMapping => map_.get(name)

    export const call = (name: string, params: any = undefined) => {
        const fct = map_.get(name)
        if (fct) {
            return fct(params)
        }
        return undefined
    }

    export const exists = (name: string): boolean => {
        return map_.get(name) !== undefined
    }

    export const names = (): string[] => {
        return Array.from(map_.keys())
    }
}

/**
 * Not used for the moment but we are thinking to replace {@link alphaMapping}
 * by this interface. All derived functions from {@link alphaMapping} will be
 * replaced by classes implenting {@link AlphaMapping}.
 * @note NOT USED FOR THE MOMENT
 * @category Mapping
 */
export interface AlphaMapping {
    /**
     * The method which transform a user alpha space to a one suitable for the
     * superposition, i.e., the components of the stress tensor, densities and
     * pressures (therefore not readable for the user).
     */
    map(userAlpha: UserAlpha): Alpha

    /**
     * The `user` dimension of the mapping
     */
    dim(userAlpha: UserAlpha): number

    /**
     * The minima of the user parameters
     */
    min(userAlpha: UserAlpha): number[]

    /**
     * The maxima of the user parameters
     */
    max(userAlpha: UserAlpha): number[]

    /**
     * The names of the user parameters
     */
    names(userAlpha: UserAlpha): string[]
}

// ----------------------------------------------------

/**
 * @category Mapping
 */
export interface alphaMapping {
    /**
     * @brief A mapping for any {@link Alpha}. Basically, it transforms a user-defined
     * alpha to a global one that can be used by superposition.
     * @param alpha The user-defined alpha vector
     * @returns The converted alpha vector
     */
    (alpha: Alpha): Alpha
}

/**
 * @brief Parameters for defining {@link Alpha}, i.e., the min/max of each value as well
 * as an optional {@link alphaMapping} which allows to convert a user-defined parameter space to the
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
 *
 * @category Mapping
 */
export type AlphaParameters = {
    min: number[]
    max: number[]
    mapping?: alphaMapping
}

/**
 * A default mapping for any {@link Alpha}. Basically it return the same alpha.
 * @see {@link alphaMapping}
 *
 * @category Mapping
 */
export const defaultMapping: alphaMapping = (params: Alpha) => params

/**
 * @category Mapping
 */
export const defaultMappingNames = (alpha: Alpha): string[] => {
    return alpha.map((_, i) => `${i}`)
}

/**
 * @category Mapping
 */
export const defaultMappingBounds = (alpha: Alpha): Array<[number, number]> => {
    return alpha.map(() => [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY])
}

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
 * @see {@link alphaMapping}
 * @see publication <br>
 * `Maerten, F., Madden, E. H., Pollard, D. D., & Maerten, L. (2016). Incorporating fault mechanics into inversions of aftershock data for the regional remote stress, with application to the 1992 Landers, California earthquake. Tectonophysics, 674, 52-64.`
 *
 * @category Mapping
 */
export const simpleAndersonMapping: alphaMapping = (alpha: Alpha): Alpha => {
    const theta = alpha[0]
    const R = alpha[1]

    if (theta < 0 || theta > 180) {
        throw new Error('Theta must be in [0°..180°]')
    }
    if (R < 0 || R > 3) {
        throw new Error('R must be in [0..3]')
    }

    const c = Math.cos(deg2rad(theta))
    const s = Math.sin(deg2rad(theta))
    const c2 = c ** 2
    const s2 = s ** 2

    if (R <= 1) {
        return [-c2 + (R - 1) * s2, R * c * s, -s2 + (R - 1) * c2]
    }
    if (R <= 2) {
        return [-R * c2 + (1 - R) * s2, c * s, -R * s2 + (1 - R) * c2]
    }
    return [R * c2 + s2, (1 - R) * c * s, R * s2 + c2]
}

/**
 * @category Mapping
 */
export const simpleAndersonMappingNames = (_alpha: Alpha): string[] => {
    return ['Theta', 'Rb']
}

/**
 * @category Mapping
 */
export const simpleAndersonMappingBounds = (
    _alpha: Alpha,
): Array<[number, number]> => {
    return [
        [0, 180],
        [0, 3],
    ]
}

/**
 * @brief Convert the regional stress parameters given by [theta, Rb, rockDensity] into [xx, xy, yy, zz]
 * @see {@link alphaMapping}
 * @see publication <br>
 * `Maerten, F., Madden, E. H., Pollard, D. D., & Maerten, L. (2016). Incorporating fault mechanics into inversions of aftershock data for the regional remote stress, with application to the 1992 Landers, California earthquake. Tectonophysics, 674, 52-64.`
 *
 * @category Mapping
 */
export const gradientAndersonMapping: alphaMapping = (alpha: Alpha): Alpha => {
    if (alpha.length < 3) {
        throw new Error(`argument alpha should be equal to 3:
        alpha = [theta, R, rockDensity]. Got ${alpha}`)
    }

    const theta = alpha[0]
    const R = alpha[1]

    if (theta < 0 || theta > 180) {
        throw new Error('Theta must be in [0°..180°]')
    }
    if (R < 0 || R > 3) {
        throw new Error('R must be in [0..3]')
    }

    const c = Math.cos(deg2rad(theta))
    const s = Math.sin(deg2rad(theta))
    const c2 = c ** 2
    const s2 = s ** 2

    let xx = 0
    let xy = 0
    let yy = 0
    let zz = 0

    const rock = alpha[2]
    const Sv = -rock * 9.81

    if (R <= 1) {
        const r = R
        xx = r * s2
        xy = c * s * r
        yy = c2 * r
        zz = 1
    } else if (R <= 2) {
        const r = 2 - R
        xx = s2
        xy = c * s
        yy = c2
        zz = r
    } else {
        const r = R - 2
        xx = r * c2 + s2
        xy = (1 - r) * c * s
        yy = r * s2 + c2
        zz = 0
    }

    return [xx * Sv, xy * Sv, yy * Sv, zz * Sv]
}

/**
 * @category Mapping
 */
export const gradientAndersonMappingNames = (_alpha: Alpha): string[] => {
    return ['Theta', 'Rb', 'Rock density']
}

/**
 * @category Mapping
 */
export const gradientAndersonMappingBounds = (
    _alpha: Alpha,
): Array<[number, number]> => {
    return [
        [0, 180],
        [0, 3],
        [0, 10000],
    ]
}

const cos = Math.cos
const sin = Math.sin

/**
 * @brief Convert the regional stress parameters given by [theta, alphShape, rockDensity] into [xx, xy, yy, zz]
 * @param alpha The user parameters. The alpha-shape parameter in alpha (teh second one) varies between -90° and 90°.
 * - The normal regime is between -90° and 0°
 * - The strike-slip regime is between 0° and 45°
 * - The reverse regime is between 45° and 90°
 * @see {@link alphaMapping}
 * @category Mapping
 */
export const gradientAndersonAlphaShapeMapping: alphaMapping = (
    alpha: Alpha,
): Alpha => {
    if (alpha.length < 3) {
        throw new Error(`argument alpha should be equal to 3:
        alpha = [theta, alphaShape, rockDensity]. Got ${alpha}`)
    }

    const theta = alpha[0]
    const alphaShape = alpha[1]
    const rock = alpha[2]

    const Sv = -rock * 9.81

    if (theta < 0 || theta > 180) {
        throw new Error('Theta must be in [0°..180°]')
    }
    if (alphaShape < -90 || alphaShape > 90) {
        throw new Error('alphaShape must be in [-90°..90°]')
    }

    const Alpha = deg2rad(alphaShape)
    const Theta = deg2rad(theta)
    return [
        (sin(Alpha) - cos(Alpha) * cos(Theta) ** 2) * Sv,
        cos(Alpha) * sin(Theta) * cos(Theta) * Sv,
        (sin(Alpha) - cos(Alpha) * sin(Theta) ** 2) * Sv,
        0,
    ]
}

/**
 * @category Mapping
 */
export const gradientAndersonAlphaShapeMappingNames = (
    _alpha: Alpha,
): string[] => {
    return ['Theta', 'alpha-shape', 'Rock density']
}

/**
 * @category Mapping
 */
export const gradientAndersonAlphaShapeMappingBounds = (
    _alpha: Alpha,
): Array<[number, number]> => {
    return [
        [0, 180],
        [-90, 90],
        [0, 10000],
    ]
}

/**
 * Same as {@link gradientAndersonAlphaShapeMapping} but with the normal regime squizzed between -45° and 0°.
 * - The normal regime is between -45° and 0°
 * - The strike-slip regime is between 0° and 45°
 * - The reverse regime is between 45° and 90°
 * @category Mapping
 */
export const gradientAndersonAlphaShapeMapping2: alphaMapping = (
    alpha: Alpha,
): Alpha => {
    if (alpha.length < 3) {
        throw new Error(`argument alpha should be equal to 3:
        alpha = [theta, alphaShape, rockDensity]. Got ${alpha}`)
    }

    const theta = alpha[0]
    const alphaShape = alpha[1]
    const rock = alpha[2]

    const Sv = -rock * 9.81

    if (theta < 0 || theta > 180) {
        throw new Error('Theta must be in [0°..180°]')
    }
    if (alphaShape < -45 || alphaShape > 90) {
        throw new Error('alphaShape must be in [-45°..90°]')
    }

    let Alpha = deg2rad(alphaShape)
    if (Alpha < 0) {
        Alpha *= 2
    }

    const Theta = deg2rad(theta)

    return [
        (sin(Alpha) - cos(Alpha) * cos(Theta) ** 2) * Sv,
        cos(Alpha) * sin(Theta) * cos(Theta) * Sv,
        (sin(Alpha) - cos(Alpha) * sin(Theta) ** 2) * Sv,
        0,
    ]
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
 * @see {@link alphaMapping}
 * @returns `[Sxx, Sxy, Syy, Szz, cavityDensity, shift1, shift2...]`
 * @example
 * ```ts
 * // provide 2 pressure shifts
 * const alpha = GradientPressureMapping([45, 0.1, 0.2, 2300, 2200, -1e6, -1e7])
 * ```
 *
 * @category Mapping
 */
export const gradientPressureMapping: alphaMapping = (alpha: Alpha): Alpha => {
    if (alpha.length < 6) {
        throw new Error(`argument alpha should be of size greater or equal to 6:
        alpha = [theta, Rh, RH, rockDensity, cavityDensity, shift1, shift2, ...]`)
    }

    let theta = alpha[0]
    //if (theta<0 || theta>180) throw new Error('Theta must be in [0°..180°]')
    theta = deg2rad(theta)

    const Kh = alpha[1]
    const KH = alpha[2]
    const rock = alpha[3]
    const magma = alpha[4] * 9.81
    const cos = Math.cos(theta)
    const sin = Math.sin(theta)
    const cos2 = cos * cos
    const sin2 = sin * sin
    const Sv = -rock * 9.81 // already incorporated: |z|
    const xx = (Kh * cos2 + KH * sin2) * Sv
    const xy = -((Kh - KH) * cos * sin) * Sv
    const yy = (Kh * sin2 + KH * cos2) * Sv
    const zz = Sv

    const shifts = [...alpha].splice(5)

    return [xx, xy, yy, zz, magma, ...shifts]
}

/**
 * @category Mapping
 */
export const gradientPressureMappingNames = (alpha: Alpha): string[] => {
    const shifts = [...alpha].splice(5).map((_, i) => `Shift${i + 1}`)
    return ['Theta', 'Rh', 'RH', 'Rock density', 'Cavity density', ...shifts]
}

/**
 * @category Mapping
 */
export const gradientPressureMappingBounds = (
    alpha: Alpha,
): Array<[number, number]> => {
    const shifts = [...alpha].splice(5).map(() => [-1e9, 1e9]) as Array<
        [number, number]
    >
    return [[0, 180], [0, 10], [0, 10], [0, 10000], [0, 10000], ...shifts]
}

// -----------------------------------------------------

/**
 * Same as {@link gradientPressureMapping} but where Kh = KH at all time.
 * For this mapping, theta is irrelevant.
 * @category Mapping
 */
export const constrainedGradientPressureMapping: alphaMapping = (
    alpha: Alpha,
): Alpha => {
    if (alpha.length < 6) {
        throw new Error(`argument alpha should be of size greater or equal to 6:
        alpha = [theta, r, r, rockDensity, cavityDensity, shift1, shift2, ...], where r is Rh and RH (same value). In that case, theta is irrelevant`)
    }

    const K = alpha[1]
    alpha[2] = alpha[1]

    const rock = alpha[3]
    const magma = alpha[4] * 9.81
    const Sv = -rock * 9.81 // already incorporated: |z|
    const xx = K * Sv
    const xy = 0
    const yy = K * Sv
    const zz = Sv

    const shifts = [...alpha].splice(5)

    return [xx, xy, yy, zz, magma, ...shifts]
}

/**
 * @category Mapping
 */
export const constrainedGradientPressureMappingNames = (
    alpha: Alpha,
): string[] => {
    const shifts = [...alpha].splice(5).map((_, i) => `Shift${i + 1}`)
    return ['theta', 'r', 'r', 'Rock density', 'Cavity density', ...shifts]
}

/**
 * @category Mapping
 */
export const constrainedGradientPressureMappingBounds = (
    alpha: Alpha,
): Array<[number, number]> => {
    const shifts = [...alpha].splice(5).map(() => [-1e9, 1e9]) as Array<
        [number, number]
    >
    return [[0, 180], [0, 10], [0, 10], [0, 10000], [0, 10000], ...shifts]
}

// ----------------------------

MappingFactory.bind(defaultMapping, 'defaultMapping')
MappingFactory.bind(simpleAndersonMapping, 'simpleAndersonMapping')
MappingFactory.bind(gradientAndersonMapping, 'gradientAndersonMapping')
MappingFactory.bind(
    gradientAndersonAlphaShapeMapping,
    'gradientAndersonAlphaShapeMapping',
)
MappingFactory.bind(
    gradientAndersonAlphaShapeMapping2,
    'gradientAndersonAlphaShapeMapping2',
)
MappingFactory.bind(gradientPressureMapping, 'gradientPressureMapping')
MappingFactory.bind(
    constrainedGradientPressureMapping,
    'constrainedGradientPressureMapping',
)
