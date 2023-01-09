const user = [82, 0.481, 0.5, 2900, 2600, 2.19e7]

// "cost": 0.079
// "fit": 92.1

const RH = 0.5
const Rh = 0.481
const Sv = user[3] * 9.81 * 1000
const P = user[4] * 9.81 * 1000 + user[5]

console.log('kP', (P / Sv).toFixed(3))

const min = 0.4

const f = (h) => (RH - h) / (P / Sv)
const D = (h) =>
    console.log(
        h.toFixed(3),
        '\t',
        f(h).toFixed(3),
        '\t',
        (f(h) / f(min)).toFixed(3),
    )

D(min)
D(Rh)
D(RH)
