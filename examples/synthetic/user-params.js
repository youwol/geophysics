module.exports = {
    // CONSTANTS + MATERIAL
    g: 9.81,
    nu: 0.25,
    E: 20,
    halspace: true,

    // REMOTE
    remote: true,
    theta: 22,
    Rh: 0.1,
    RH: 1.3,
    rockDensity: 3,

    // CAVITY
    cavityDensity: 2,
    shift: 5,

    // INSAR
    LOS: [0.1, -0.5, -0.8],
    fringe: 0.2,
    nx: 50,
    ny: 50,

    // SOLVER
    tol: 1e-9,
    maxIter: 200,

    // INVERSION
    shiftMin: -100,
    shiftMax: 100,
    RsMin: 0,
    RsMax: 3,
    RvMin: 0,
    RvMax: 10,
    nbSimuls: 1000,
}
