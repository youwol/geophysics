import { simpleAndersonMapping, gradientPressureMapping } from '../lib/mapping'

test('Mapping theta-R', () => {
    const alpha = simpleAndersonMapping([60, 1.1])
    expect(alpha[0]).toBeCloseTo(-0.35)             // Sxx
    expect(alpha[1]).toBeCloseTo(0.4330127018922194)// Sxy
    expect(alpha[2]).toBeCloseTo(-0.85)             // Syy
})

test('Mapping kh-kH-pressure', () => {
    const alpha = gradientPressureMapping([45, 0.1, 0.2, 2300, 2200, 1e7])
    expect(alpha[0]).toEqual(-3889.9442500361242)    // Sxx
    expect(alpha[1]).toEqual(-1008.5623360409696)    // Sxy
    expect(alpha[2]).toEqual(-2878.9557499638777)    // Syy
    expect(alpha[3]).toEqual(-22563)                 // Szz
    expect(alpha[4]).toEqual(2200)                  // cavity density
    expect(alpha[5]).toEqual(1e7)                   // shift
})

test('Mapping kh-kH-pressure multi shifts', () => {
    const alpha = gradientPressureMapping([45, 0.1, 0.2, 2300, 2200, 1e7, -1e6, 0.1])
    expect(alpha[0]).toEqual(-3889.9442500361242)    // Sxx
    expect(alpha[1]).toEqual(-1008.5623360409696)    // Sxy
    expect(alpha[2]).toEqual(-2878.9557499638777)    // Syy
    expect(alpha[3]).toEqual(-22563)                 // Szz
    expect(alpha[4]).toEqual(2200)                  // cavity density
    expect(alpha[5]).toEqual(1e7)                   // shift 1
    expect(alpha[6]).toEqual(-1e6)                  // shift 2
    expect(alpha[7]).toEqual(0.1)                   // shift 3
})
