import { cost } from './cost'
import { InversionModel } from './inversion'
import { defaultMapping } from './mapping'
import { Alpha } from './types'

export class Domain2D {
    x : number
    y : number
    nx: number
    ny: number
    model: InversionModel = undefined

    /**
     * @param model The model used for the inversion
     * @param nX The number of points for the x axis
     * @param nY The number of points for the y axis
     */
    constructor(
        {model, nX=10, nY=10}:
        {model: InversionModel, nX?: number, nY?: number})
    {
        this.model = model
        this.nx = nX
        this.ny = nY
        if (this.model.alpha.mapping === undefined) this.model.alpha.mapping = defaultMapping
    }

    /**
     * 
     * @param xAxis The index of the xAxis from mapping (user-defined parameters)
     * @param yAxis The index of the yAxis from mapping (user-defined parameters)
     */
    evaluate(xAxis=0, yAxis=1, alpha: Alpha): number[] {

        const limits: {min:number, max:number}[] = []
        this.model.alpha.min.forEach( (m: number, i: number) => {
            limits.push( {min: m, max: this.model.alpha.max[i]} )
        })

        const xMin = limits[xAxis].min
        const xMax = limits[xAxis].max
        const yMin = limits[yAxis].min
        const yMax = limits[yAxis].max

        const r = new Array(this.nx*this.ny).fill(0)

        for (let i=0; i<this.nx; ++i) {
            alpha[xAxis] = xMin + i*(xMax-xMin)/(this.nx-1)
            for (let j=0; j<this.ny; ++j) {
                alpha[yAxis] = yMin + i*(yMax-yMin)/(this.ny-1)
                const newAlpha = this.model.alpha.mapping( alpha )
                r[i*this.nx+j] = cost(this.model.data, newAlpha)
            }
        }

        return r
    }

}
