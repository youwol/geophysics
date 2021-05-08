import { defaultMapping } from "./mapping"
import { InversionModel, InversionResult } from "./inversion"
import { cost } from "./cost"

/**
 * @brief A monte-carlo algorithm to perform an inversion.
 * @param params The inversion parameters
 * @category Inversion
 */
export const monteCarlo = ( params: InversionModel, n: number): InversionResult => {
    const genRandom = (min: number, max: number) => min + Math.random()*(max-min)

    if (params.alphaParameters === undefined) throw new Error('alphaParameters is undefined')

    const limits: {min:number, max:number}[] = []
    params.alphaParameters.min.forEach( (m: number, i: number) => {
        limits.push( {min: m, max: params.alphaParameters.max[i]} )
    })

    if (params.alphaParameters.mapping === undefined) params.alphaParameters.mapping = defaultMapping
    // Check the generated alpha
    params.alphaParameters.mapping( limits.map( l => genRandom(l.min, l.max) ) )


    let solution: InversionResult = {
        alpha: [],
        user : [],
        cost : 1e32
    }

    for (let i=0; i<n; ++i) {
        // generate the alpha
        const userParams = limits.map( l => genRandom(l.min, l.max) )
        const alpha      = params.alphaParameters.mapping( userParams )

        const c = cost(params.data, alpha)
        if (c < solution.cost) {
            solution.cost = c
            solution.alpha = alpha
            solution.user = userParams
        }
    }

    return solution
}
