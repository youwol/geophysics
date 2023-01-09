import { simpleAndersonMapping, gradientPressureMapping } from '../lib/mapping'

test('Mapping theta-R', () => {
    const alpha = simpleAndersonMapping([60, 1.1])
    expect(alpha[0]).toBeCloseTo(-0.35) // Sxx
    expect(alpha[1]).toBeCloseTo(0.4330127018922194) // Sxy
    expect(alpha[2]).toBeCloseTo(-0.85) // Syy
})

test('Mapping kh-kH-pressure', () => {
    const alpha = gradientPressureMapping([45, 0.1, 0.2, 2300, 2200, 1e7])
    expect(alpha[0]).toBeCloseTo(-3384.45) // Sxx
    expect(alpha[1]).toBeCloseTo(-1128.15) // Sxy
    expect(alpha[2]).toBeCloseTo(-3384.45) // Syy
    expect(alpha[3]).toBeCloseTo(-22563) // Szz
    expect(alpha[4]).toBeCloseTo(2200 * 9.81) // cavity density
    expect(alpha[5]).toBeCloseTo(1e7) // shift
})

test('Mapping kh-kH-pressure multi shifts', () => {
    const alpha = gradientPressureMapping([
        45, 0.1, 0.2, 2300, 2200, 1e7, -1e6, 0.1,
    ])
    expect(alpha[0]).toBeCloseTo(-3384.45) // Sxx
    expect(alpha[1]).toBeCloseTo(-1128.15) // Sxy
    expect(alpha[2]).toBeCloseTo(-3384.45) // Syy
    expect(alpha[3]).toBeCloseTo(-22563) // Szz
    expect(alpha[4]).toBeCloseTo(2200 * 9.81) // cavity density
    expect(alpha[5]).toBeCloseTo(1e7) // shift 1
    expect(alpha[6]).toBeCloseTo(-1e6) // shift 2
    expect(alpha[7]).toBeCloseTo(0.1) // shift 3
})
