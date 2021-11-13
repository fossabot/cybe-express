var {
    IncomingMessage
} = require('http');
var typeis = require('type-is');
var accepts = require('accepts');
var parseRange = require('../range-parser')

var req = Object.create(IncomingMessage.prototype);

req.get = (header) => {
    if (!header) throw new TypeError('header argument is required to req.get');

    if (typeof header !== 'string') throw new TypeError('header must be a string to req.get');

    var lower = header.toLowerCase();

    switch (lower) {
        case 'referer':
        case 'referrer':
            return this.headers.referrer ||
                this.headers.referer;
        default:
            return this.headers[lower];
    }
}

req.accepts = function () {
    var accept = accepts(this);
    return accept.types.apply(accept, arguments);
};

req.acceptsEncodings = function () {
    var accept = accepts(this);
    return accept.encodings.apply(accept, arguments);
};

req.acceptsCharsets = function () {
    var accept = accepts(this);
    return accept.charsets.apply(accept, arguments);
};

req.acceptsLanguages = function () {
    var accept = accepts(this);
    return accept.languages.apply(accept, arguments);
};

req.range = function range(size, options) {
    var range = this.get('Range');
    if (!range) return;
    return parseRange(size, range, options);
};

req.param = function param(name, defaultValue = '') {
    var params = this.params || {};
    var body = this.body || {};
    var query = this.query || {};

    var args = arguments.length === 1 ? 'name' : 'name, default';
    console.warn(`req.param(${args}): Use req.params, req.body, or req.query instead`);

    if (null != params[name] && params.hasOwnProperty(name)) return params[name];
    if (null != body[name]) return body[name];
    if (null != query[name]) return query[name];

    return defaultValue;
};

req.is = function is(types) {
    var arr = types;

    // support flattened arguments
    if (!Array.isArray(types)) {
        arr = new Array(arguments.length);
        for (var i = 0; i < arr.length; i++) {
            arr[i] = arguments[i];
        }
    }

    return typeis(this, arr);
};

module.exports = req;