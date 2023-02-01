import { gradientAndersonMapping, simpleAndersonMapping } from '../lib'
import { fromThetaRbToStress } from '../lib/utils/stressUtils'

test('testing utils stress', () => {
    console.log(simpleAndersonMapping([45, 0.1]))
    console.log(fromThetaRbToStress(45, 0.1))
    console.log(gradientAndersonMapping([45, 0.1, 1]))

    expect(true).toBeTruthy()
    console.warn('TO BE DONE')
})
