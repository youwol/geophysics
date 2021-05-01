/**
 * Some utility functions and classes
 * @module Utils
 */
import { Plane } from "./types"
import * as math from '../../../math/src/lib'
import { ASerie } from "../../../dataframe/src/lib"

/**
 * @brief Triangle coordinate system.
 * Allows to transform `math.Vector3` from global to triangle local coordinate system, 
 * and vis versa
 * @category Utils
 */
export class TriangleCS {
    private mat_ = [1,0,0, 0,1,0, 0,0,1]

    setBase(x: math.Vector3, y: math.Vector3, z: math.Vector3) {
        let v1 = vector(y, x, true) // see bottom for vector()
        let v2 = vector(z, x, true)
        return this.setNormal(math.cross(v1,v2))
    }

    setNormal(n: math.Vector3) {
        const TINY_ANGLE_ = 1e-7
        let x3 = math.clone(n)
        if (math.norm(x3) < TINY_ANGLE_) {
            throw new Error('Cannot calculate element normal. Elt must have a very odd shape.')
        }
        x3 = math.normalize(x3)

        let x2 = math.cross([0, 0, 1], x3 as math.Vector3)
        if (math.norm(x2) < TINY_ANGLE_) {
            x2 = [0, 1, 0]
        }
        x2 = math.normalize(x2) as math.Vector3

        let x1 = math.cross(x2, x3 as math.Vector3)
        x1 = math.normalize(x1) as math.Vector3

        this.mat_[0] = x1[0]
        this.mat_[1] = x2[0]
        this.mat_[2] = x3[0]
        this.mat_[3] = x1[1]
        this.mat_[4] = x2[1]
        this.mat_[5] = x3[1]
        this.mat_[6] = x1[2]
        this.mat_[7] = x2[2]
        this.mat_[8] = x3[2]
    }

    get matrix() {
        return this.mat_
    }
    get dip(): math.Vector3 {
        return [this.mat_[0][0], this.mat_[1][0], this.mat_[2][0]]
    }
    get strike() : math.Vector3 {
        return [this.mat_[0][1], this.mat_[1][1], this.mat_[2][1]]
    }
    get normal(): math.Vector3 {
        return [this.mat_[0][2], this.mat_[1][2], this.mat_[2][2]]
    }

    toLocal(v: math.Vector3): math.Vector3 {
        return multVec(this.mat_ as math.Vector9, v)
    }

    toGlobal(v: math.Vector3): math.Vector3 {
        return multTVec(this.mat_ as math.Vector9, v)
    }

    shearComponent(t: math.Vector3): math.IVector {
        return  math.scale(math.sub(t, this.normalComponent(t)), -1)
    }

    normalComponent(t: math.Vector3): math.IVector {
        return math.scale(this.normal, -math.dot(t, this.normal))
    }
}

// -------------------------------------------

/**
 * @brief Plane fitting to many 3D points
 * @param points The points coordinates in flat array
 * @return {point: Vec3, normal: Vec3} The plane parameters fitting the points
 * in a least squares sens
 * @category Utils
 */
export function fittingPlane(points: ASerie): Plane {
    if (points.length < 3) {
        throw new Error('Not enough points to fit a plane')
    }

    const sum: math.Vector3 = [0, 0, 0]
    for (let i=0; i<points.array.length; i+=3) {
        sum[0] += points.array[i]
        sum[1] += points.array[i+1]
        sum[2] += points.array[i+2]
    }
    let centroid = math.scale(sum, 1/(points.length) ) as math.Vector3

    // Calc full 3x3 covariance matrix, excluding symmetries:
    let xx = 0.0, xy = 0.0, xz = 0.0
    let yy = 0.0, yz = 0.0, zz = 0.0

    for (let i=0; i<points.length; i+=3) {
        let r = [points[i]-centroid[0], points[i+1]-centroid[1], points[i+2]-centroid[2]]
        xx += r[0]**2
        xy += r[0] * r[1]
        xz += r[0] * r[2]
        yy += r[1]**2
        yz += r[1] * r[2]
        zz += r[2]**2
    }

    let det_x = yy*zz - yz*yz
    let det_y = xx*zz - xz*xz
    let det_z = xx*yy - xy*xy
    let det_max = Math.max(det_x, det_y, det_z)
    if (det_max <= 0) {
        throw new Error('determlinant is <0')
    }

    // Pick path with best conditioning:
    let dir: math.Vector3 = [0,0,0]
    if (det_max == det_x) {
        dir = [det_x, xz*yz - xy*zz, xy*yz - xz*yy]
    } else if (det_max == det_y) {
        dir = [xz*yz - xy*zz, det_y, xy*xz - yz*xx]
    } else {
        dir = [xy*yz - xz*yy, xy*xz - yz*xx, det_z]
    }

    return {
        point: centroid,
        normal: math.normalize(dir) as math.Vector3
    }
}

/**
 * @brief Get the distance from a 3D plabe to a plane
 * @param p The considered 3D point
 * @param plane The plane defined with a point and its normal
 * @category Utils
 */
export function distanceFromPointToPlane(p: math.Vector3, plane: Plane) {
    //let sb=0, sn=0, sd=0

    const sn = -math.dot( plane.normal, vector(plane.point, p, true) )
    const sd = math.dot(plane.normal, plane.normal)
    const sb = sn / sd
    const B = math.add( p, math.scale(plane.normal, sb) ) as math.Vector3
    return math.norm( vector(p, B) )
}

// ----------------------------------------------------------------------

function vector(p1: math.Vector3, p2: math.Vector3, normalize: boolean=false): math.Vector3 {
    if (normalize) {
        const x = p2[0]-p1[0]
        const y = p2[1]-p1[1]
        const z = p2[2]-p1[2]
        const n = Math.sqrt(x**2+y**2+z**2)
        return [x/n, y/n, z/n]
    }
    return [p2[0]-p1[0], p2[1]-p1[1], p2[2]-p1[2]]
}

function multVec(e: math.Vector9, v: math.Vector3): math.Vector3 {
    const x = v[0], y = v[1], z = v[2]
    return [
        e[ 0 ] * x + e[ 3 ] * y + e[ 6 ] * z,
        e[ 1 ] * x + e[ 4 ] * y + e[ 7 ] * z,
        e[ 2 ] * x + e[ 5 ] * y + e[ 8 ] * z]
}

function multTVec(e: math.Vector9, v: math.Vector3): math.Vector3 {
    const x = v[0], y = v[1], z = v[2]
    return [
        e[ 0 ] * x + e[ 1 ] * y + e[ 2 ] * z,
        e[ 3 ] * x + e[ 4 ] * y + e[ 5 ] * z,
        e[ 6 ] * x + e[ 7 ] * y + e[ 8 ] * z]
}