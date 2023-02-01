import { DataFrame, getNameSeries } from '@youwol/dataframe'

/**
 * From superposition, guess the dimension as well as the Serie's names
 */
export function attributeDetector(dataframe: DataFrame) {
    const names = getNameSeries(dataframe)
    const set = new Set()
    names.forEach((name) => {
        const decomp = decompose(name)
        if (decomp) {
            decomp.itemSize = dataframe.series[name].itemSize
            set.add(decomp)
        }
    })

    const infos = detect(set)
    return infos
}

function decompose(str: string): {
    itemSize: number
    name: string
    index: number
} {
    const regex = /[+-]?\d+(\.\d+)?/g
    const match = regex.exec(str)
    if (match && match.length) {
        const index = match[0]
        const name = str.replace(index, '')
        return {
            itemSize: 0,
            name,
            index: parseFloat(index),
        }
    }
    return undefined
}

/* elsint @typescript-eslint/no-explicit-any: off -- no choice ? */
function detect(attrsInput: Set<any>) {
    const attrs = new Set(attrsInput)
    const result = []

    while (attrs.size !== 0) {
        // peak the first attr name
        const a = attrs.values().next().value
        const numbers: Array<number> = []
        const conglo = {
            itemSize: a.itemSize,
            name: a.name,
            start: 0,
            end: 0,
        }

        attrs.forEach((attr) => {
            if (attr.name === a.name) {
                numbers.push(attr.index)
                attrs.delete(attr)
            }
        })

        const min = Math.min(...numbers)
        const max = Math.max(...numbers)
        // Check consistency between min and max (use Array.includes())

        let ok = true
        for (let i: number = min; i <= max; ++i) {
            if (numbers.includes(i) === false) {
                ok = false
                break
            }
        }
        if (ok) {
            conglo.start = min
            conglo.end = max
            result.push(conglo)
        }
    }

    return result
}
