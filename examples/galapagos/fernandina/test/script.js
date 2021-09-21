const nx = 5
const ny = 7

const data1 = new Array(nx*ny)
{
    let id = 0
    for (let i=0; i<nx; ++i) {
        for (let j=0; j<ny; ++j) {
            data1[id++] = i*ny+j
        }    
    }
}
console.log(data1)

const data2 = new Array(nx)
let id = 0
for (let i=0; i<nx; ++i) {
    data2[i] = new Array(ny)
    for (let j=0; j<ny; ++j) {
        data2[i][j] = data1[id++]
    }    
}

console.log(data2)