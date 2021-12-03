import { Serie, apply } from '@youwol/dataframe'
import { Data } from '../data'
import { Alpha } from '../types'
import { 
    add, dot, square,
    div, mult, norm, negate, addNumber, weightedSum
} from '@youwol/math'

/**
 * Cost for a Gps measure (at one point)
 * 
 * <center><img style="width:60%; height:60%;" src="media://gps.png"></center>
 * <center><blockquote><i>
 * Equation for a GPS data. Upper sripts m and c stand for measured and computed, respectively
 * </i></blockquote></center>
 * 
 * @example
 * ```ts
 * const gps = new GpsData({
 *     dataframe,
 *     measure: 'gps',
 *     compute: ['u1', 'u2', 'u3'],
 *     weight: 2,
 *     weights: 'ptsWeights'
 * })
 * ```
 * @see [[Data]]
 * @see [[createData]]
 * @see [[monteCarlo]]
 * @category Geophysics
 */
export class GpsData extends Data {
    constructor(params: any) {
        super(params)
        if (this.measure.itemSize !== 3) {
            throw new Error('measure should have itemSize = 3')
        }
        this.compute.forEach( c => {
            if (c.itemSize !== 3) {
                throw new Error('compute should have itemSize = 3 (displacement)')
            }
        })
    }

    name() {return 'GpsData'}

    costs(data: Serie | Alpha): Serie {
        const d = this.generateData(data)
        if (d.itemSize !== 3) {
            throw new Error('provided Serie must have itemSize = 3 (displ)')
        }
        const L  = dot(this.measure, d)
        const no = norm(this.measure)
        const nc = norm(d)

        // 0.5*w*( (1-d/(no*nc))**2 + (1-no/nc)**2 )
        return mult( add([
            square(addNumber(negate( div(L, mult(no, nc)) ), 1)),
            square(addNumber(negate(div(no, nc)), 1))
        ]), 0.5)
    }

    generate(alpha: Alpha): Serie {
        return weightedSum(this.compute, alpha)
    }
}

/**
 * Cost for a vertical Gps measure (at one point)
 * 
 * <center><img style="width:25%; height:25%;" src="media://horizon.png"></center>
 * <center><blockquote><i>
 * Equation for a vertical GPS data.
 * </i></blockquote></center>
 * 
 * @example
 * ```ts
 * const gps = new VerticalGpsData({
 *     dataframe,
 *     measure: 'gps',
 *     compute: ['u1', 'u2', 'u3'],
 *     weight: 2,
 *     weights: 'ptsWeights'
 * })
 * ```
 * @see [[Data]]
 * @see [[createData]]
 * @see [[monteCarlo]]
 * @category Geophysics
 */
export class VerticalGpsData extends Data {
    constructor(params: any) {
        super(params)
        if (this.measure.itemSize !== 1) throw new Error('measure should have itemSize = 1 (displ)')
        this.compute.forEach( c => {
            if (c.itemSize !== 3) throw new Error('compute should have itemSize = 3 (displacement)')
        })
    }

    name() {return 'VerticalGpsData'}

    costs(data: Serie | Alpha): Serie {
        const d = this.generateData(data)
        if (d.itemSize !== 1) throw new Error('provided Serie must have itemSize = 1')
        return square(addNumber(negate(div(d, this.measure)), 1))
    }

    generate(alpha: Alpha): Serie {
        return apply( weightedSum(this.compute, alpha), item => item[2] )
    }
}