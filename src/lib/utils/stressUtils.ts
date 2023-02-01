import { deg2rad, rad2deg } from './angleUtils'

export function fromThetaRbToStress(Theta: number, rb: number) {
    let R: number, alpha: number

    if (rb <= 1) {
        R = rb
        alpha = rad2deg(Math.atan2(R - 1, R))
    } else if (rb <= 2) {
        R = 2 - rb
        alpha = rad2deg(Math.atan(1 - R))
    } else {
        R = rb - 2
        alpha = rad2deg(Math.atan2(1, 1 - R))
    }

    return fromThetaAlphaToStress(Theta, alpha)
}

export function fromThetaAlphaToStress(
    Theta: number,
    ALPHA: number,
    normal_eps = 0,
) {
    let Alpha = ALPHA

    if (ALPHA == -90) {
        // Exactly -90 for normal regime
        Alpha = ALPHA + normal_eps
    } else if (ALPHA == 90) {
        // Exactly +90 for reverse regime
        Alpha = 90 - normal_eps
    }

    const theta = deg2rad(Theta)
    const costheta = Math.cos(theta)
    const sintheta = Math.sin(theta)
    const costheta2 = costheta * costheta
    const sintheta2 = sintheta * sintheta
    const alpha = deg2rad(Alpha)
    const cosalpha = Math.cos(alpha)
    const sinalpha = Math.sin(alpha)
    const Sxx = sinalpha - cosalpha * costheta2
    const Sxy = cosalpha * sintheta * costheta
    const Syy = sinalpha - cosalpha * sintheta2

    return [Sxx, Sxy, Syy]
}
