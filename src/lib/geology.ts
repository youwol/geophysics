/**
 * Cost functions (aka, mistfit functions) for geology
 * @module geology
 */

import { 
    Serie, DataFrame, apply
} from '@youwol/dataframe'

import { 
    eigenVector, abs, dot, normalize, square, rotateAxis, eigen,
    div, mult, sub, norm, negate, addNumber, mean, weightedSum,
    vec
} from '@youwol/math'

import { Data } from './data'
import { Alpha } from './types'

// export function costStriation(
//     {measure, compute, weights}:
//     {measure: ASerie, compute: ASerie, weights?: ASerie}
// ): number {
//     const d  = dot(measure, compute)
//     const no = norm(measure)
//     const nc = norm(compute)
//     return mean( addNumber(negate(abs(div(dot(measure, compute), mult(no, nc)))), 1) ) as number
//     // (1 - Math.abs( dot(obs, calc)/(no*nc) ))
// }

/**
 * Cost for a fault striation
 * @note Make sure that the coordinate system of the measure is the same as the 
 * computed slip vector.
 * @note You can use the class [[TriangleCS]].
 * @example
 * ```ts
 * const data = new StriationData({
 *     dataframe,
 *     measure: 'normals',
 *     compute: ['u1', 'u2', 'u3'],
 *     weight: 1,
 *     weights: 'ptsWeights'
 * })
 * ```
 * @see [[Data]]
 * @see [[monteCarlo]]
 * @see [[createData]]
 * @category Geology
 */
export class StriationData extends Data {
    constructor(params: any) {
        super(params)
    }
    cost(alpha: Alpha): number {
        const compute = weightedSum(this.compute, alpha)
        //return costStriation({measure: this.measure, compute, weights: this.weights})
        const d  = dot(this.measure, compute)
        const no = norm(this.measure)
        const nc = norm(compute)
        return mean( addNumber(negate(abs(div(dot(this.measure, compute), mult(no, nc)))), 1) ) as number
    }

    generate(alpha: Alpha): Serie {
        throw new Error('TODO')
        //return undefined
    }
}

// export function costJoint(
//     {measure, compute, weights}:
//     {measure: ASerie, compute: ASerie, weights?: ASerie}
// ): number {
//     const e  = eigenVector(compute).map( v => [v[0], v[1], v[2]] )
//     const ns = normalize(measure)
//     return mean( square(sub(abs(dot(ns, e)), 1)) ) as number // w*(1-d)**2
// }

/**
 * Cost for joint fractures
 * 
 * <center><img style="width:40%; height:40%;" src="media://joint.png"></center>
 * <center><blockquote><i>
 * Relation between a joint and the three principales stresses
 * </i></blockquote></center>
 * 
 * @example
 * ```ts
 * const data = new JointData({
 *     dataframe,
 *     measure: 'normals',
 *     compute: ['u1', 'u2', 'u3'],
 *     weight: 1,
 *     weights: 'ptsWeights'
 * })
 * ```
 * @see [[Data]]
 * @see [[monteCarlo]]
 * @see [[createData]]
 * @category Geology
 */
export class JointData extends Data {
    constructor(params: any) {
        super(params)
    }

    cost(alpha: Alpha): number {
        const compute = weightedSum(this.compute, alpha)
        //return costJoint({measure: this.measure, compute, weights: this.weights})
        const e  = eigenVector(compute).map( v => [v[0], v[1], v[2]] )
        const ns = normalize(this.measure)
        return mean( square(sub(abs(dot(ns, e)), 1)) ) as number // w*(1-d)**2
    }

    generate(alpha: Alpha): Serie {
        return apply(eigenVector(weightedSum(this.compute, alpha)), v => [v[0], v[1], v[2]] )
    }
}

// export function costStylolite(
//     {measure, compute, weights}:
//     {measure: ASerie, compute: ASerie, weights?: ASerie}
// ): number {
//     const e  = eigenVector(compute).map( v => [v[6], v[7], v[8]] )
//     const ns = normalize(measure)
//     return mean( square(sub(abs(dot(ns, e)), 1)) ) as number
// }

/**
 * Cost for stylolite fractures
 * 
 * <center><img style="width:40%; height:40%;" src="media://stylolite.png"></center>
 * <center><blockquote><i>
 * Relation between a stylolite and the three principales stresses
 * </i></blockquote></center>
 * 
 * @category Geology
 */
export class StyloliteData extends Data {
    constructor(params: any) {
        super(params)
    }
    cost(alpha: Alpha): number {
        const compute = weightedSum(this.compute, alpha)
        //return costStylolite({measure: this.measure, compute, weights: this.weights})
        const e  = eigenVector(compute).map( v => [v[6], v[7], v[8]] )
        const ns = normalize(this.measure)
        return mean( square(sub(abs(dot(ns, e)), 1)) ) as number // w*(1-d)**2
    }

    generate(alpha: Alpha): Serie {
        return apply(eigenVector(weightedSum(this.compute, alpha)), v => [v[6], v[7], v[8]] )
    }
}


/**
 * Cost for conjugate planes
 * 
 * <center><img style="width:50%; height:50%;" src="media://conjugate.png"></center>
 * <center><blockquote><i>
 * Relation between a shear fracture and the three principales stresses
 * </i></blockquote></center>
 * 
 * @example
 * ```ts
 * const data = new ConjugateData({
 *     dataframe,
 *     measure: 'normals',
 *     compute: ['u1', 'u2', 'u3'],
 *     weight: 1,
 *     weights: 'ptsWeights',
 *     friction: 60,
 *     project: true
 * })
 * ```
 * @see [[Data]]
 * @see [[monteCarlo]]
 * @see [[createData]]
 * @category Geology
 */
export class ConjugateData extends Data {
    theta   = Math.PI*(45 - 60/2)/180
    project = false

    constructor(
        {friction, project, dataframe, measure, compute, weights, weight}:
        {friction?: number, project?: boolean, dataframe: DataFrame, measure: string, compute: string[], weights?: string, weight?: number}
    ) {
        super({dataframe, measure, compute, weights, weight})
        
        if (friction!==undefined) this.theta  = Math.PI*(45 - friction/2)/180
        if (project!==undefined) this.project = project
    }

    cost(alpha: Alpha): number {
        const compute = weightedSum(this.compute, alpha)
        
        if (this.project) {
            return mean(this.measure.map( (n1: number[], i: number) => {
                const d  = Math.sqrt(n1[0]**2 + n1[1]**2)
                const nn = [n1[0]/d, n1[1]/d, 0]
                const N  = this.fractureNormal(compute.itemAt(i) as vec.Vector6) // Sigma2, so very simple
                return this.fractureCost(nn as vec.Vector3, N as vec.Vector3)
            }) ) as number
        }
    
        //const theta  = Math.PI*(45.0 - fric/2.0)/180
        return mean(normalize(this.measure).map( (normal, i) => {
            const conjugate = this.conjugateNormals(compute.itemAt(i) as vec.Vector6)
            const c1        = this.fractureCost(normal, conjugate.n1 as vec.Vector3)
            const c2        = this.fractureCost(normal, conjugate.n2 as vec.Vector3)
            return Math.min(c1, c2)
        }) ) as number
    }

    generate(alpha: Alpha): Serie {
        throw new Error('TODO')
        //return undefined
    }

    // ------------------------

    private conjugateNormals = (stress: vec.Vector6) => {
        const e = eigen(stress)
        const nS3 = [-e.vectors[0], -e.vectors[1], -e.vectors[2]] as vec.Vector3
        const v2  = [-e.vectors[3], -e.vectors[4], -e.vectors[5]] as vec.Vector3
        const v3  = [-e.vectors[6], -e.vectors[7], -e.vectors[8]] as vec.Vector3
        return {
            n1: rotateAxis(v2,  this.theta, v3), 
            n2: rotateAxis(v2, -this.theta, nS3)
        }
    }
    
    private fractureNormal = (stress: vec.Vector6) => {
        const e = eigen(stress)
        const v2 = [e[3], e[4], e[5]]
        if (this.project) {
            const d = Math.sqrt(v2[0]**2 + v2[1]**2)
            v2[0] /= d
            v2[1] /= d
            v2[2]  = 0
        }
        return [v2[1], -v2[0], v2[2]] // orthogonal projected
    }

    private fractureCost = (n: vec.Vector3, N: vec.Vector3) => {
        return 1.0 - Math.abs(vec.dot(n,N))
    }
}

// export function costConjugate(
//     {measure, compute, weights, projected=false, fric=60, ...others}:
//     {measure: ASerie, compute: ASerie, weights?: ASerie, projected?: boolean, fric?: number}
// ): number {
//     if (measure === undefined) throw new Error('normals is undefined')
//     if (compute === undefined) throw new Error('stress is undefined')
//     if (measure.itemSize !== 3) throw new Error('normals should have itemSize = 3')
//     if (compute.itemSize !== 6) throw new Error('stress should have itemSize = 6')

//     const conjugateNormals = (stress: Vector6, theta: number) => {
//         const e = eigen(stress)
//         const nS3 = [-e.vectors[0], -e.vectors[1], -e.vectors[2]] as Vector3
//         const v2  = [-e.vectors[3], -e.vectors[4], -e.vectors[5]] as Vector3
//         const v3  = [-e.vectors[6], -e.vectors[7], -e.vectors[8]] as Vector3
//         return {
//             n1: rotateAxis(v2,  theta, v3), 
//             n2: rotateAxis(v2, -theta, nS3)
//         }
//     }
    
//     const fractureNormal = (stress: Vector6, projected: boolean) => {
//         const e = eigen(stress)
//         const v2 = [e[3], e[4], e[5]]
//         if (projected) {
//             const d = Math.sqrt(v2[0]**2 + v2[1]**2)
//             v2[0] /= d
//             v2[1] /= d
//             v2[2]  = 0
//         }
//         return [v2[1], -v2[0], v2[2]] // orthogonal projected
//     }
//     const fractureCost = (n: Vector3, N: Vector3) => {
//         return 1.0 - Math.abs(mdot(n,N))
//     }

//     if (projected) {
//         return mean(measure.map( (n1: number[], i: number) => {
//             const d  = Math.sqrt(n1[0]**2 + n1[1]**2)
//             const nn = [n1[0]/d, n1[1]/d, 0]
//             const N  = fractureNormal(compute.itemAt(i) as Vector6, projected) // Sigma2, so very simple
//             return fractureCost(nn as Vector3, N as Vector3)
//         }) ) as number
//     }

//     const theta  = Math.PI*(45.0 - fric/2.0)/180
//     return mean(normalize(measure).map( (normal, i) => {
//         const conjugate = conjugateNormals(compute.itemAt(i) as Vector6, theta)
//         const c1        = fractureCost(normal, conjugate.n1 as Vector3)
//         const c2        = fractureCost(normal, conjugate.n2 as Vector3)
//         return Math.min(c1, c2)
//     }) ) as number
// }