import { ASerie, DataFrame } from "@youwol/dataframe"
import { Alpha } from "./types"

/**
 * Convenient  function to create a specific [[Data]] with its
 * associated parameters
 * @param Type The type of data (class name)
 * @param param The parameters
 * @see [[Data]]
 * @example
 * ```ts
 * const data = createData(InsarData, {
 *     dataframe: dfInsar,
 *     los: [0,0,1],
 *     measure: 'insar',
 *     compute: ['d1', 'd2', 'd3']
 * })
 * ```
 */
export const createData = (Type: any, param: any): Data => {
    return new Type(param)
}

export abstract class Data {
    constructor(
        {dataframe, measure, compute, weights, weight}:
        {dataframe: DataFrame, measure: string, compute: string[], weights?: string, weight?: number}
    ) {
        if (dataframe===undefined) throw new Error(`dataframe is undefined`)

        this.dataframe = dataframe
        this.measure = this.dataframe.get(measure)
        this.compute = compute.map( name => dataframe.get(name) )
        this.weights = dataframe.get(weights)
        if (weight !== undefined) this.weight = weight

        if (this.measure===undefined) throw new Error(`measure ${measure} is undefined`)

        this.compute.forEach( (c,i) => {
            if (c === undefined) throw new Error(`compute ${compute[i]} is undefined`)
        })
    }

    /**
     * Generate data according to alpha. Simply stated, given alpha, return the
     * synthetic measure of the data (gps, insar, fracture orientation ...) that
     * can be compared to the real measure.
     * @param alpha 
     */
    abstract generate(alpha: Alpha): ASerie 

    /**
     * The cost function of the data
     */
    abstract cost(alpha: Alpha): number

    // --------------------------------------------------

    protected readonly dataframe: DataFrame

    /**
     * The name of the serie for the measures (must be in the dataframe)
     */
    protected readonly measure: ASerie

    /**
     * The name of the serie for the measures weight. When used, each point should
     * have a weight (number). This parameter can be skipped
     */
    protected readonly weights: ASerie = undefined

    /**
     * The names of the series to perform superposition (all must be in the dataframe)
     */
    protected readonly compute: ASerie[]

    /**
     * The weight of this data. Default value is 1
     */
    readonly weight: number = 1
}