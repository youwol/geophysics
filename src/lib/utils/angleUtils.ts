export function deg2rad(a: number) {
    return (a * Math.PI) / 180
}

export function rad2deg(a: number) {
    return (a * 180) / Math.PI
}

export function between_0_360(a: number) {
    if (a < 0) {
        while (a < 0) {
            a += 360
        }
    } else if (a > 360) {
        while (a > 360) {
            a -= 360
        }
    }
    return a
}
