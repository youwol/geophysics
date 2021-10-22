const df   = require('@youwol/dataframe')
const geom = require('@youwol/geometry')
const math = require('@youwol/math')

const params = require('./user-params')

function printProgress(progress) {
    process.stdout.clearLine()
    process.stdout.cursorTo(0)
    process.stdout.write(progress)
}

module.exports = {printProgress}