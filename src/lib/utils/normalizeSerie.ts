import { Serie } from '@youwol/dataframe'
import { minMax } from '@youwol/math'

export const normalize = (s: Serie): Serie => {
    if (s === undefined) {
        throw new Error('series is undefined')
    }

    if (s.itemSize === 1) {
        const mM = minMax(s)
        const m = mM[0]
        const l = 1 / (mM[1] - m)
        return s.map((v) => l * (v - m))
    }

    return s.map((item) => {
        let l = Math.sqrt(item.reduce((acc, v) => acc + v * v, 0))
        if (l === 0) {
            l = 1
        }
        return item.map((v) => v / l)
    })
}
