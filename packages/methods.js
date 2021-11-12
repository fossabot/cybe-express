module.exports = (() => {
    return require('http').METHODS.map((method) => {
        return method.toLowerCase()
    })
})();