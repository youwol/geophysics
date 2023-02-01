import { vec } from '@youwol/math'
import { deg2rad } from './angleUtils'

export function fromDipDipAzimToNormal({
    dipAngle,
    dipAzimuth,
}: {
    dipAngle: number
    dipAzimuth: number
}): vec.Vector3 {
    const delta = deg2rad(dipAngle)
    const alpha = deg2rad(dipAzimuth)

    return vec.normalize([
        Math.sin(delta) * Math.sin(alpha),
        Math.sin(delta) * Math.cos(alpha),
        Math.cos(delta),
    ]) as vec.Vector3
}
