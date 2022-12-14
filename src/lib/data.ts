import { Serie, DataFrame } from '@youwol/dataframe'
import { mean, minMax, weightedSum } from '@youwol/math'
import { Alpha } from './types'

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
    constructor({
        dataframe,
        measure,
        compute,
        weights,
        weight,
    }: {
        dataframe: DataFrame
        measure: string
        compute?: string[]
        weights?: string
        weight?: number
    }) {
        if (dataframe === undefined) throw new Error(`dataframe is undefined`)

        this.dataframe = dataframe

        this.measure = this.dataframe.series[measure]
        //console.log('Using nb points =', this.measure.count)

        // this.weights_ = dataframe.series[weights]
        // if (this.weights_ !== undefined) {
        //     this.sumWeights = this.weights_.array.reduce( (acc, cur) => acc+1/cur, 0 )
        //     console.log('Using weight at points. Sum =', this.sumWeights)
        // }
        this.setWeights(weights) // setter

        if (weight !== undefined) this.weight = weight

        if (this.measure === undefined)
            throw new Error(`measure ${measure} is undefined`)

        if (compute !== undefined) {
            this.compute = compute.map((name) => dataframe.series[name])
            this.compute.forEach((c, i) => {
                if (c === undefined)
                    throw new Error(
                        `compute ${compute[i]} at index ${i} is undefined`,
                    )
            })
        }
    }

    setWeights(w: string) {
        this.weights_ = this.dataframe.series[w]
        if (this.weights_ !== undefined) {
            this.sumWeights = this.weights_.array.reduce(
                (acc, cur) => acc + 1 / cur,
                0,
            )
        }
    }

    get weights() {
        return this.weights_
    }

    abstract name(): string

    /**
     * The cost function of the data according to a provided Alpha or a Serie
     */
    cost(alpha: Serie | Alpha): number {
        const c = this.costs(alpha)
        if (c.itemSize !== 1)
            throw new Error('costs() should return a Serie with itemSize = 1')
        return (mean(c) as number) * this.weight
    }

    /**
     * Get the costs as a Serie (one cost per point data)
     * @example
     * ```ts
     * costs(data: Serie | Alpha): Serie {
     *   let d = this.generateData(data)
     *   // your implementation here
     *   const e  = normalize(d)
     *   const ns = normalize(this.measure)
     *   return square(sub(abs(dot(ns, e)), 1)) // w*(1-d)**2
     * }
     * ```
     * @see [[JointData]]
     */
    abstract costs(data: Serie | Alpha): Serie

    /**
     * Generate data according to alpha. Simply stated, given alpha, return the
     * synthetic data (gps, insar, fracture orientation ...) that
     * can be compared to the real measure.
     * @example
     * ```ts
     * class Insar extends Data {
     *   constructor(private readonly sat: [number,number,number]) {
     *   }
     *
     *   costs(data: Serie | Alpha) {
     *     const compute = this.generateData(data)
     *     return square(addNumber(negate(abs(div(compute, this.measure))), 1))
     *   }
     *
     *   // --------------
     *
     *   generate(alpha: Alpha): Serie {
     *     const displ = weightedSum(this.compute, alpha)
     *     return dot(displ, this.sat)
     *   }
     * }
     * ```
     */
    abstract generate(alpha: Alpha): Serie

    // ===================================================================

    protected generateData(data: Serie | Alpha): Serie | any {
        if (Serie.isSerie(data)) {
            return data as Serie
        }

        return this.generate(data as Alpha)
    }

    protected readonly dataframe: DataFrame

    /**
     * The name of the serie for the measures (must be in the dataframe if any)
     */
    protected measure: Serie

    /**
     * Optional: The name of the serie for the measures weight. When used, each point should
     * have a weight (number). This parameter can be skipped
     */
    protected weights_: Serie = undefined

    /**
     * Optional: The names of the series to perform superposition (must be in the dataframe)
     */
    protected readonly compute: Serie[]

    /**
     * The weight of this data. Default value is 1
     */
    readonly weight: number = 1

    protected sumWeights: number = 1.0
}
