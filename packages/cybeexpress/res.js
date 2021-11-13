var {
    ServerResponse
} = require('http');

var res = Object.create(ServerResponse.prototype)

res.status = function status(code) {
    this.statusCode = code;
    return this;
};

module.exports = res