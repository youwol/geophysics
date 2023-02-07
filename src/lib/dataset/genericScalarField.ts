import { Serie, DataFrame, Manager } from '@youwol/dataframe'
import { weightedSum, PositionDecomposer, normalize } from '@youwol/math'
import { Data } from './data'
import { Alpha } from '../types'

/**
 * Parameters for {@link GenericScalarFieldData} constructor
 * @category Geophysics
 */
export type GenericScalarFieldDataParams = {
    dataframe: DataFrame
    positions: string
    measure: string
    coordIndex: number
    compute?: string[]
    weights?: string
    weight?: number
    xScale?: number
    yScale?: number
    useDerivative?: boolean
}

/**
 * Cost for any scalar field. This data uses the derivative along a given direction in order to
 * compare the trend of the scalar field instead of the values themself.
 *
 * The `xScale` and `yScale` are only applied to the computed data, not the measurements!
 *
 * If `useDerivative=false`, then the measures and the computations are normalized separately.
 * ```
 * @see {@link Data}
 * @see {@link monteCarlo}
 * @see {@link createData}
 * @category Geology
 */
export class GenericScalarFieldData extends Data {
    private positions: Serie = undefined
    private coordIndex = 0
    private xScale = 1
    private yScale = 1
    private useDerivative = false

    static clone(param: GenericScalarFieldDataParams): Data {
        return new GenericScalarFieldData(param)
    }

    constructor({
        dataframe,
        positions,
        measure,
        coordIndex,
        compute,
        weights,
        weight = 1,
        xScale = 1,
        yScale = 1,
        useDerivative = false,
    }: GenericScalarFieldDataParams) {
        super({ dataframe, measure, compute, weights, weight })

        this.xScale = xScale
        this.yScale = yScale
        this.useDerivative = useDerivative

        const mng = new Manager(dataframe, [new PositionDecomposer()])

        if (this.measure.itemSize !== 1) {
            throw new Error('Measure (' + measure + ') must have itemSize=1')
        }

        if (coordIndex < 0) {
            throw new Error('coordIndex (' + coordIndex + ') must be >= 0')
        }
        if (coordIndex >= this.compute[0].itemSize) {
            throw new Error(
                'coordIndex (' +
                    coordIndex +
                    ') must be < ' +
                    this.compute[0].itemSize,
            )
        }

        // Use the manager
        this.positions = mng.serie(1, positions)
        if (this.positions === undefined) {
            throw new Error(
                'Cannot find serie named ' + positions + ' in the dataframe',
            )
        }
        if (this.positions.itemSize !== 1) {
            throw new Error(
                'Positions (' + positions + ') must have itemSize=1',
            )
        }

        // Compute the derivatives of the measure
        if (useDerivative) {
            this.measure = derivative({
                data: this.measure,
                positions: this.positions,
                xScale: 1,
                yScale: 1,
            })
        } else {
            // Normalize the measures
            this.measure = normalize(this.measure)
        }
    }

    name() {
        return 'GenericScalarFieldData'
    }

    costs(data: Serie | Alpha): Serie {
        const compute = this.generateData(data) as Serie
        if (compute.itemSize !== 1) {
            throw new Error('generateData must have itemSize = 1')
        }

        // TODO: add the weights and this.sumWeights

        // Cost function:
        //
        // | C'    |
        // |--- - 1|
        // | M'    |
        //
        // where
        //   C' = derivative of the computed
        //   M' = derivative of the measured

        const r = compute.clone()

        for (let i = 0; i < compute.count; ++i) {
            const m = this.measure.itemAt(i) as number
            const c = compute.itemAt(i) as number
            if (m === 0) {
                r.setItemAt(i, 0)
            } else {
                r.setItemAt(i, Math.abs(m / c - 1))
            }
        }
        // const r = abs(sub(div(compute, this.measure), 1))

        return r
    }

    generate(alpha: Alpha): Serie {
        return generateGenericScalarField({
            data: weightedSum(this.compute, alpha),
            coordIndex: this.coordIndex,
            positions: this.positions,
            xScale: this.xScale,
            yScale: this.yScale,
            useDerivative: this.useDerivative,
        })
    }

    /* eslint unused-imports/no-unused-vars: off -- no choise */
    /* eslint @typescript-eslint/no-explicit-any: off -- no choise */
    generateInDataframe({
        alpha,
        prefix,
        options = undefined,
    }: {
        alpha: Alpha
        prefix: string
        options?: { [key: string]: any }
    }): void {
        throw new Error('TODO')
    }
}

export function generateGenericScalarField({
    data,
    coordIndex,
    positions,
    xScale,
    yScale,
    useDerivative,
}: {
    data: Serie
    coordIndex: number
    positions: Serie
    xScale: number
    yScale: number
    useDerivative: boolean
}): Serie {
    if (useDerivative) {
        return derivative({
            data: data.map((d) => d[coordIndex]),
            positions,
            xScale,
            yScale,
        })
    } else {
        return normalize(data.map((d) => d[coordIndex]))
        // return data.map( d => d[coordIndex]*yScale )
    }
}

// Compute the derivative of a scalar Serie using the positions and the central difference
//
function derivative({
    data,
    positions,
    xScale,
    yScale,
}: {
    data: Serie
    positions: Serie
    xScale: number
    yScale: number
}): Serie {
    const n = data.count
    let prevDat = data.itemAt(0) as number
    let prevPos = positions.itemAt(0) as number

    const newData = data.clone(false)

    for (let i = 1; i < n - 1; ++i) {
        const nexDat = data.itemAt(i + 1) as number
        const nexPos = positions.itemAt(i + 1) as number
        const a = (xScale * (nexDat - prevDat)) / (yScale * (nexPos - prevPos))
        newData.setItemAt(i, a)

        prevDat = data.itemAt(i) as number
        prevPos = positions.itemAt(i) as number
    }

    newData.setItemAt(0, newData.itemAt(1))
    newData.setItemAt(n - 1, newData.itemAt(n - 2))

    return newData
}
