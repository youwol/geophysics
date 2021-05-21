import { defaultMapping } from "./mapping"
import { InversionModel, InversionResult } from "./inversion"
import { cost } from "./cost"

/**
 * @brief A monte-carlo algorithm to perform an inversion.
 * @param params The inversion parameters
 * @param n The number of simulations
 * @example
 * ```ts
 * const result = monteCarlo({
 *     data: [
 *         createData(GpsData, {
 *             dataframe: dataframe,
 *             measure  : 'gps',             // <--- loaded data
 *             compute  : ['u1', 'u2', 'u3'] // <--- 3 computed simulations
 *         }),
 *         createData(InsarData, {
 *             dataframe: dataframe,
 *             los      : LOS as math.Vector3,
 *             measure  : 'insar',           // <--- loaded data
 *             compute  : ['d1', 'd2', 'd3'] // <--- 3 computed simulations
 *         })
 *     ],
 *     alpha: {
 *         mapping: undefined,
 *         min    : [0,0,0], // therefore dim = 3
 *         max    : [1,1,1]
 *     }
 * }, 10000)
 * ```
 * @see [[alphaMapping]]
 * @see [[AlphaParameters]]
 * @see [[Data]]
 * @category Inversion
 */
export const monteCarlo = ( params: InversionModel, n: number): InversionResult => {
    const genRandom = (min: number, max: number) => min + Math.random()*(max-min)

    if (params.alpha === undefined) throw new Error('alpha is undefined')

    const limits: {min:number, max:number}[] = []
    params.alpha.min.forEach( (m: number, i: number) => {
        limits.push( {min: m, max: params.alpha.max[i]} )
    })

    if (params.alpha.mapping === undefined) params.alpha.mapping = defaultMapping
    // Check the generated alpha
    params.alpha.mapping( limits.map( l => genRandom(l.min, l.max) ) )

    // Set the data weight if necessary
    // params.data.forEach( d => d.weight===undefined ? d.weight=1 : 1)

    let solution: InversionResult = {
        alpha: [],
        user : [],
        cost : 1e32,
        fit  : 0
    }

    for (let i=0; i<n; ++i) {
        // generate the alpha
        const userParams = limits.map( l => genRandom(l.min, l.max) )
        const alpha      = params.alpha.mapping( userParams )

        const c = cost(params.data, alpha)
        if (c < solution.cost) {
            solution.cost  = c
            solution.fit   = Math.round( (1-c)*10000 )/100 // 2 decimals max
            solution.alpha = alpha
            solution.user  = userParams
        }
    }

    return solution
}