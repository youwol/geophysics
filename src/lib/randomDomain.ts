import { defaultMapping } from './mapping'
import { InversionModel, InversionResult } from './inversion'
import { cost } from './cost'
import { randomMT } from '@youwol/math'
import { Serie } from '@youwol/dataframe'


export const randomDomain = (
    params: InversionModel,
    n: number,
): Serie => {
    const genRandom = (min: number, max: number) => min + randomMT(max - min)

    if (params.alpha === undefined) {
        throw new Error('alpha is undefined')
    }

    const limits: { min: number; max: number }[] = []
    params.alpha.min.forEach((m: number, i: number) => {
        limits.push({ min: m, max: params.alpha.max[i] })
    })

    if (params.alpha.mapping === undefined) {
        params.alpha.mapping = defaultMapping
    }

    // Check the generated alpha (will trigger an exception of something is going wrong)
    params.alpha.mapping(limits.map((l) => genRandom(l.min, l.max)))

    const mod = (n / 100) * 5 // 5%
    const array: number[] = []

    for (let i = 0; i < n; ++i) {
        // generate the alpha
        const userParams = limits.map((l) => genRandom(l.min, l.max))
        const alpha = params.alpha.mapping(userParams)

        const c = cost(params.data, alpha)
        array.push(userParams[1]/3, userParams[0]/180, c)
        
        if (i % mod == 0 && params.onProgress) {
            params.onProgress(i, (i * 100) / n)
        }
    }

    return Serie.create({array, itemSize: 3})
}
