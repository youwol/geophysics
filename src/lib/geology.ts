/**
 * Cost functions (aka, mistfit functions) for geology
 * @module geology
 */

import { 
    ASerie, eigenVector, abs, dot, normalize, square, 
    div, mult, sub, norm, negate, addNumber
} from '../../../dataframe/src/lib'
import * as math from '../../../math/src'

/**
 * Cost for a fault striation
 * @param obs The observed striation vector in the triangle coordinate system
 * @param calc The computed displacement in the triangle coordinate system
 * @param w Weight with default value 1
 * @note Make sure that the coordinate system of the measure is the same as the 
 * computed slip vector.
 * @note You can use the class [[TriangleCS]].
 * 
 * @category Geology
 */
export function costStriation(obs: ASerie, calc: ASerie, w = 1): ASerie {
    const d  = dot(obs, calc)
    const no = norm(obs)
    const nc = norm(calc)
    return mult( addNumber(negate(abs(div(dot(obs, calc), mult(no, nc)))), 1), w)
    // w*(1 - Math.abs( dot(obs, calc)/(no*nc) ))
}

/**
 * Cost for joint fractures
 * @param n The normal to the observed fracture
 * @param stress The computed symetric stress tensor
 * @param w Weight with default value 1
 * 
 * <center><img style="width:40%; height:40%;" src="media://joint.png"></center>
 * <center><blockquote><i>
 * Relation between a joint and the three principales stresses
 * </i></blockquote></center>
 * 
 * @category Geology
 */
export function costJoint(n: ASerie, stress: ASerie, w: number = 1): ASerie {
    const e  = eigenVector(stress).map( v => [v[0], v[1], v[2]] )
    const ns = normalize(n)
    return mult(square(sub(abs(dot(ns, e)), 1)), w) // w*(1-d)**2
}

/**
 * Cost for stylolite fractures
 * @param n The normal to the observed fracture
 * @param stress The computed symetric stress tensor
 * @param w Weight with default value 1
 * 
 * <center><img style="width:40%; height:40%;" src="media://stylolite.png"></center>
 * <center><blockquote><i>
 * Relation between a stylolite and the three principales stresses
 * </i></blockquote></center>
 * 
 * @category Geology
 */
export function costStylolite(n: ASerie, stress: ASerie, w: number = 1): ASerie {
    const e  = eigenVector(stress).map( v => [v[6], v[7], v[8]] )
    const ns = normalize(n)
    return mult(square(sub(abs(dot(ns, e)), 1)), w)
}


/**
 * Cost for conjugate planes
 * @param n The normal to the observed fracture
 * @param stress The computed symetric stress tensor
 * @param w Weight with default value 1
 * @param fric Friction angle in degrees with default value 60 
 * @param projected If we have to project on a plane with default value false
 * 
 * <center><img style="width:50%; height:50%;" src="media://conjugate.png"></center>
 * <center><blockquote><i>
 * Relation between a shear fracture and the three principales stresses
 * </i></blockquote></center>
 * 
 * @category Geology
 */
export function costConjugate(n: ASerie, stress: ASerie, w = 1, fric = 60, projected = false) {
    if (n === undefined) throw new Error('normals is undefined')
    if (stress === undefined) throw new Error('stress is undefined')
    if (n.itemSize !== 3) throw new Error('normals should have itemSize = 3')
    if (stress.itemSize !== 6) throw new Error('stress should have itemSize = 6')

    const conjugateNormals = (stress: math.Vector6, theta: number) => {
        const e = math.eigen(stress)
        const nS3 = [-e.vectors[0], -e.vectors[1], -e.vectors[2]] as math.Vector3
        const v2  = [-e.vectors[3], -e.vectors[4], -e.vectors[5]] as math.Vector3
        const v3  = [-e.vectors[6], -e.vectors[7], -e.vectors[8]] as math.Vector3
        return {
            n1: math.rotateAxis(v2,  theta, v3), 
            n2: math.rotateAxis(v2, -theta, nS3)
        }
    }
    
    const fractureNormal = (stress: math.Vector6, projected: boolean) => {
        const e = math.eigen(stress)
        const v2 = [e[3], e[4], e[5]]
        if (projected) {
            const d = Math.sqrt(v2[0]**2 + v2[1]**2)
            v2[0] /= d
            v2[1] /= d
            v2[2]  = 0
        }
        return [v2[1], -v2[0], v2[2]] // orthogonal projected
    }
    const fractureCost = (n: math.Vector3, N: math.Vector3) => {
        return 1.0 - Math.abs(math.dot(n,N))
    }

    if (projected) {
        return n.map( (n1: number[], i: number) => {
            const d  = Math.sqrt(n1[0]**2 + n1[1]**2)
            const nn = [n1[0]/d, n1[1]/d, 0]
            const N  = fractureNormal(stress.itemAt(i) as math.Vector6, projected) // Sigma2, so very simple
            return fractureCost(nn as math.Vector3, N as math.Vector3)
        })
        
    }

    const theta  = Math.PI*(45.0 - fric/2.0)/180
    normalize(n).map( (normal, i) => {
        const conjugate = conjugateNormals(stress.itemAt(i) as math.Vector6, theta)
        const c1        = fractureCost(normal, conjugate.n1 as math.Vector3)
        const c2        = fractureCost(normal, conjugate.n2 as math.Vector3)
        return Math.min(c1, c2)
    })
}