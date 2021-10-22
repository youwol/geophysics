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
import { exit } from 'process'

import { Data } from './data'
import { Alpha } from './types'


// /**
//  * Cost for a fault striation
//  * @note Make sure that the coordinate system of the measure is the same as the 
//  * computed slip vector.
//  * @note You can use the class [[TriangleCS]].
//  * @example
//  * ```ts
//  * const data = new StriationData({
//  *     dataframe,
//  *     measure: 'normals',
//  *     compute: ['u1', 'u2', 'u3'],
//  *     weight: 1,
//  *     weights: 'ptsWeights'
//  * })
//  * ```
//  * @see [[Data]]
//  * @see [[monteCarlo]]
//  * @see [[createData]]
//  * @category Geology
//  */
// export class StriationData extends Data {
//     constructor(params: any) {
//         super(params)
//     }
//     costs(data: Serie | Alpha): Serie {
//         let d = this.generateData(data)
//         if (d.itemSize !== 3) throw new Error('provided Serie must have itemSize = 3 (aka, normal)')
        
//         d  = dot(this.measure, d)

//         const no = norm(this.measure)
//         const nc = norm(d)

//         return addNumber(negate(abs(div(dot(this.measure, d), mult(no, nc)))), 1)
//     }

//     generate(alpha: Alpha): Serie {
//         throw new Error('TODO (see joint)')
//         //return undefined
//     }
// }

/**
 * Cost for joint fractures. Recall that the stresses from simulations are in
 * engineer convention.
 * 
 * If `useNormals` is set to true, then the normals to the joints are used.
 * Otherwise, the orientation of teh joints are used.
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
 *     useNormals: true,
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
    private useNormals = true
    private projected  = false

    constructor(
        {dataframe, measure, compute, weights, weight, useNormals=true, projected=false}:
        {dataframe: DataFrame, measure: string, compute?: string[], weights?: string, weight?: number, useNormals?: boolean, projected?: boolean})
    {
        super({dataframe,measure,compute,weights, weight})
        this.measure = normalize(this.measure)
        this.useNormals = useNormals!==undefined ? useNormals : true
        this.projected = projected!==undefined ? projected : false
    }

    name() {return 'JointData'}

    costs(data: Serie | Alpha): Serie {
        const d = this.generateData(data)
        if (d.itemSize !== 3) throw new Error('generateData must have itemSize = 3 (normals to the planes)')
        if (this.useNormals) {
            return square(sub(abs(dot(this.measure, d)), 1)) // w*(1-d)^2
        }
        else {
            return square(dot(this.measure, d)) // w*(1-d)**2
        }
    }

    generate(alpha: Alpha): Serie {
        return generateJoints( {stress: weightedSum(this.compute, alpha), projected: this.projected} )
        //return apply(eigenVector(weightedSum(this.compute, alpha)), v => [v[0], v[1], v[2]] )
    }
}

export class DikeData extends JointData {
    name() {return 'DikeData'}
}

/**
 * Generate joints from stress data. A joint is represented by its normal
 * @example
 * ```ts
 * const joints = geop.generateJoints({
 *      stress: computedStressSerie,
 *      projected: true
 * })
 * ```
 * @see [[JointData]]
 * @category Geology
 */
export function generateJoints(
    {stress, projected=false}:
    {stress: Serie, projected?: boolean}): Serie
{
    const ns = eigenVector(stress).map( v => [v[0], v[1], v[2]] )
    return projected===true ? apply(ns, n => [-n[1], n[0], 0]) : ns
}

/**
 * Generate dikes from stress data. This is essentially the same as [[generateJoints]].
 * A dike is represented by its normal
 * @example
 * ```ts
 * const dikes = geop.generateDikes({
 *      stress: computedStressSerie,
 *      projected: false
 * })
 * ```
 * @see [[generateJoints]]
 * @see [[JointData]]
 * @category Geology
 */
export function generateDikes(
    {stress, projected=false}:
    {stress: Serie, projected?: boolean}): Serie
{
    return generateJoints({stress, projected})
}

/**
 * Cost for stylolite fractures. A stylolite is represented by its normal
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
        this.measure = normalize(this.measure)
    }

    name() {return 'StyloliteData'}

    costs(data: Serie | Alpha): Serie {
        const d = normalize( this.generateData(data) )
        if (d.itemSize !== 3) throw new Error('generateData must have itemSize = 3 (a normal)')
        return square(sub(abs(dot(this.measure, d)), 1)) // w*(1-d)**2
    }

    generate(alpha: Alpha): Serie {
        return generateStylolites( {stress: weightedSum(this.compute, alpha), projected: false} )
        //return apply(eigenVector(weightedSum(this.compute, alpha)), v => [v[6], v[7], v[8]] )
    }
}

/**
 * Generate stylolites from stress data
 * @example
 * ```ts
 * const stylolites = geop.generateStylolites({
 *      stress: computedStressSerie,
 *      projected: false
 * })
 * ```
 * @see [[StylolitesData]]
 * @category Geology
 */
export function generateStylolites(
    {stress, projected=false}:
    {stress: Serie, projected?: boolean}):Serie
{
    const ns = eigenVector(stress).map( v => [v[6], v[7], v[8]] )
    return projected===true ? apply(ns, n => [-n[1], n[0], 0]) : ns
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

    name() {return 'ConjugateData'}

    costs(data: Serie | Alpha): Serie {
        const d = this.generateData(data)

        if (d.itemSize !== 6) throw new Error('provided Serie must have itemSize = 6 (aka, stress')
        
        if (this.project) {
            return this.measure.map( (n1: number[], i: number) => {
                const L  = Math.sqrt(n1[0]**2 + n1[1]**2)
                const nn = [n1[0]/L, n1[1]/L, 0]
                const N  = this.fractureNormal(d.itemAt(i) as vec.Vector6) // Sigma2, so very simple
                return this.fractureCost(nn as vec.Vector3, N as vec.Vector3)
            })
        }
    
        //const theta  = Math.PI*(45.0 - fric/2.0)/180
        return normalize(this.measure).map( (normal, i) => {
            const conjugate = this.conjugateNormals(d.itemAt(i) as vec.Vector6)
            const c1        = this.fractureCost(normal, conjugate.n1 as vec.Vector3)
            const c2        = this.fractureCost(normal, conjugate.n2 as vec.Vector3)
            return Math.min(c1, c2)
        })
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

/**
 * Generate from stress data either 2 series representing the normals of the conjugate planes,
 * or one serie if projected = true (direction of S2). For the former case, the friction angle
 * is used. For the later, friction angle is irrelevant.
 * @example
 * ```ts
 * const conjugates = geop.generateConjugates({ // {n1: Serie, n2: Serie}
 *      stress: computedStressSerie,
 *      friction: 30,
 *      projected: false
 * })
 * console.log( conjugates.n1, conjugates.n2 )
 * 
 * const conjugate = geop.generateConjugates({ // Serie
 *      stress: computedStressSerie,
 *      friction: 30,
 *      projected: true
 * })
 * console.log( conjugate )
 * ```
 * @see [[ConjugateData]]
 * @category Geology
 */
export function generateConjugates(
    {stress, friction, projected=false}:
    {stress: Serie, friction: number, projected?: boolean}): {n1: Serie, n2: Serie} | Serie
{
    if (stress === undefined) {
        throw new Error('provided stress Serie is undefined')
    }
    if (friction === undefined) {
        throw new Error('provided friction is undefined')
    }
    if (projected === true) {
        return stress.map( s => {
            const e = eigen(s).vectors
            const v2 = [e[3], e[4], e[5]]
            if (projected === true) {
                const d = Math.sqrt(v2[0]**2 + v2[1]**2)
                v2[0] /= d
                v2[1] /= d
                v2[2]  = 0
            }
            return [v2[1], -v2[0], v2[2]]
        })
    }

    const theta  = Math.PI*(45 - friction/2)/180

    return {
        n1: stress.map( s => {
            const e = eigen(s).vectors
            const v2  = [-e[3], -e[4], -e[5]] as vec.Vector3
            const v3  = [-e[6], -e[7], -e[8]] as vec.Vector3
            return rotateAxis(v2,  theta, v3)
        }),
        n2: stress.map( s => {
            const e = eigen(s).vectors
            const nS3 = [-e[0], -e[1], -e[2]] as vec.Vector3
            const v2  = [-e[3], -e[4], -e[5]] as vec.Vector3
            return rotateAxis(v2, -theta, nS3)
        })
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
// export function costStylolite(
//     {measure, compute, weights}:
//     {measure: ASerie, compute: ASerie, weights?: ASerie}
// ): number {
//     const e  = eigenVector(compute).map( v => [v[6], v[7], v[8]] )
//     const ns = normalize(measure)
//     return mean( square(sub(abs(dot(ns, e)), 1)) ) as number
// }
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