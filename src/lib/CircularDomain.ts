import { cost } from './cost'
import { InversionModel } from './inversion'
import { Alpha } from './types'
import { Serie } from '@youwol/dataframe'
import { deg2rad } from './utils'

/**
 * This circular stress domain only works with (theta, Rb)
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
 * const d = new geo.CircularDomain({model, nX:50, nY: 70})
 * const serie = d.evaluate(sol) // a Serie with userInfo
 * ```
 * @category Domain
 */
export class CircularDomain {
    x: number
    y: number
    nTheta: number
    nRb: number
    innerRadius = 0
    model: InversionModel = undefined

    /**
     * @param model The model used for the inversion
     * @param nX The number of points for the x axis
     * @param nY The number of points for the y axis
     */
    constructor({
        model,
        nx = 10, // theta
        ny = 10, // Rb
        innerRadius = 0,
    }: {
        model: InversionModel
        nx?: number // theta
        ny?: number // Rb
        innerRadius?: number
    }) {
        this.model = model
        this.nTheta = nx
        this.nRb = ny
        this.innerRadius = innerRadius
        if (this.model.alpha.mapping === undefined) {
            throw new Error('(theta, Rb) mapping is required')
        }
    }

    /**
     * Compute a 2D domain (cost function according to varying x and y axis choosen by
     * the user).
     */
    evaluate(alpha: Alpha): Serie {
        const positions: number[] = []
        const r = this.innerRadius

        console.log('doing domain with sampling', this.nTheta, this.nRb)

        for (let i = 0; i < this.nTheta; ++i) {
            alpha[0] = (i * 180) / (this.nTheta - 1) // theta
            for (let j = 0; j < this.nRb; ++j) {
                alpha[1] = (j * 3) / (this.nRb - 1) // Rb

                const ang = deg2rad(alpha[0])
                const x = (alpha[1] + r) * Math.sin(ang)
                const y = -(alpha[1] + r) * Math.cos(ang)
                const newAlpha = this.model.alpha.mapping(alpha)
                const c = cost(this.model.data, newAlpha)

                if (Number.isNaN(c)) {
                    console.log(
                        `While generating the domain: cost is NaN for (x = ${alpha[0]}, y = ${alpha[1]})`,
                    )
                }

                positions.push(x, y, c)
            }
        }
        return Serie.create({ array: positions, itemSize: 3 })
    }
}
