import * as math from '../../../math/src'

/**
 * @brief Alpha vector which can be of any size
 */
export type Alpha = number[]

 /**
  * @brief The definition of a plane in 3D
  */
export type Plane = {
    point : math.Vector3,
    normal: math.Vector3
}
