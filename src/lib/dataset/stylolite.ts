import { apply, Serie } from '@youwol/dataframe'
import { eigenVector, normalize, weightedSum } from '@youwol/math'
import { Alpha } from '../types'
import { Data } from './data'
import { JointData, JointDataParams } from './joint'

export type StyloliteDataParams = JointDataParams

/**
 * Cost for stylolite fractures.
 *
 * <center><img style="width:40%; height:40%;" src="media://stylolite.png"></center>
 * <center><blockquote><i>
 * Relation between a stylolite and the three principales stresses
 * </i></blockquote></center>
 *
 * @see {@link JointData}
 * @category Geology
 */
export class StyloliteData extends JointData {
    static clone(param: StyloliteDataParams): Data {
        return new StyloliteData(param)
    }

    constructor({
        dataframe,
        measure,
        compute,
        weights,
        weight,
        useNormals = true,
        projected = false,
        useAngle = true,
    }: StyloliteDataParams) {
        super({
            dataframe,
            measure,
            compute,
            weights,
            weight,
            useNormals,
            useAngle,
            projected,
        })
    }

    name() {
        return 'StyloliteData'
    }

    generate(alpha: Alpha, forExport: boolean): Serie {
        return generateStylolite({
            stress: weightedSum(this.compute, alpha),
            projected: forExport ? false : this.projected,
        })
    }
}

/**
 * Generate stylolites from stress data. A stylolite is represented by its normal
 * @example
 * ```ts
 * const s = geop.generateStylolite({
 *      stress: computedStressSerie,
 *      projected: true
 * })
 * ```
 * @see {@link StyloliteData}
 * @category Geology
 */
export function generateStylolite({
    stress,
    projected = false,
}: {
    stress: Serie
    projected?: boolean
}): Serie {
    const ns = eigenVector(stress).map((v) => [v[6], v[7], v[8]]) // SIGMA-3 for engineers
    if (projected) {
        return normalize(
            apply(ns, (n) => {
                const x = n[0]
                const y = n[1]
                let l = Math.sqrt(x ** 2 + y ** 2)
                if (l === 0) {
                    l = 1
                }
                return [x / l, y / l, 0]
            }),
        )
    }
    return ns
}
