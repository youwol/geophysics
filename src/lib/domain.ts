import { cost } from './cost'
import { InversionModel } from './inversion'
import { defaultMapping } from './mapping'
import { Alpha } from './types'
import { Serie, createEmptySerie } from '@youwol/dataframe'

/**
 * @example
 * ```js
 * const model = {
 *    data: [insar],
 *    alpha: {
 *        mapping: gradientPressureMapping,
 *        min: [0,   0, 0, Rsed, Rmag, -1e9],
 *        max: [180, 5, 5, Rsed, Rmag,  1e9]
 *    }
 * }
 * ...
 * const sol = const result = geo.monteCarlo(model, 100000)
 * const d = new geo.Domain2D({model, nX:50, nY: 70})
 * const serie = d.evaluate(0, 5, sol) // a Serie with userInfo
 *
 * console.log(serie.userData)
 * // Will display
 * // {
 * //   nX: 50,
 * //   nY: 70,
 * //   xMin: 0,
 * //   xMax: 180,
 * //   yMin: -1e9,
 * //   yMax: 1e9
 * // }
 *
 * // Tranforming the domain for Plotly:
 * // ---------------------------------
 * const nX = serie.userData.nX
 * const nY = serie.userData.nY
 * const data = new Array(nX)
 * let id = 0
 * for (let i=0; i<nX; ++i) {
 *     data[i] = new Array(nY)
 *     for (let j=0; j<nY; ++j) {
 *         data[i][j] = serie.array[id++]
 *     }
 * }
 * // Use Plotly with data...
 * ```
 */
export class Domain2D {
    x: number
    y: number
    nx: number
    ny: number
    model: InversionModel = undefined

    /**
     * @param model The model used for the inversion
     * @param nX The number of points for the x axis
     * @param nY The number of points for the y axis
     */
    constructor({
        model,
        nX = 10,
        nY = 10,
    }: {
        model: InversionModel
        nX?: number
        nY?: number
    }) {
        this.model = model
        this.nx = nX
        this.ny = nY
        if (this.model.alpha.mapping === undefined)
            this.model.alpha.mapping = defaultMapping
    }

    /**
     * Compute a 2D domain (cost function according to varying x and y axis choosen by
     * the user).
     * @param xAxis The index of the xAxis from mapping (user-defined parameters)
     * @param yAxis The index of the yAxis from mapping (user-defined parameters)
     * @param alpha The alpha to use (note that the values used are those differents
     * from xAxis and yAxis indices)
     */
    evaluate(xAxis = 0, yAxis = 1, alpha: Alpha): Serie {
        const limits: { min: number; max: number }[] = []
        this.model.alpha.min.forEach((m: number, i: number) => {
            limits.push({ min: m, max: this.model.alpha.max[i] })
        })

        const xMin = limits[xAxis].min
        const xMax = limits[xAxis].max
        const yMin = limits[yAxis].min
        const yMax = limits[yAxis].max

        //const r = new Array(this.nx*this.ny).fill(0)
        const r = createEmptySerie({
            Type: undefined,
            count: this.nx * this.ny,
            itemSize: 1,
        })
        r.userData = {
            nx: this.nx,
            ny: this.ny,
            xMin,
            xMax,
            yMin,
            yMax,
        }

        for (let i = 0; i < this.nx; ++i) {
            alpha[xAxis] = xMin + (i * (xMax - xMin)) / (this.nx - 1)
            for (let j = 0; j < this.ny; ++j) {
                alpha[yAxis] = yMin + (i * (yMax - yMin)) / (this.ny - 1)
                const newAlpha = this.model.alpha.mapping(alpha)
                r.array[i * this.nx + j] = cost(this.model.data, newAlpha)
            }
        }

        return r
    }
}
