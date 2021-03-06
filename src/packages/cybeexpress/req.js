var typeis = require('type-is');
var accepts = require('accepts');
var {
    isIP
} = require('node:net');
var proxyaddr = require('../proxyaddr');
var parseRange = require('../range-parser');
var {
    IncomingMessage
} = require('node:http');

function defineprop(name, getter) {
    Object.defineProperty(req, name, {
        configurable: true,
        enumerable: true,
        get: getter
    });
};

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

defineprop('ip', () => {
    var trust = this.app.get('trust proxy fn');
    return proxyaddr(this, trust) || req.headers['x-forwarded-for'].split(',').shift() || req.socket.remoteAddress
});

defineprop('ips', () => {
    var trust = this.app.get('trust proxy fn');
    var addrs = proxyaddr.all(this, trust);
    addrs.reverse().pop();

    return addrs;
});

defineprop('subdomains', () => {
    var hostname = this.hostname || [];

    var offset = this.app.get('subdomain offset') || 0;
    var subdomains = !isIP(hostname) ? hostname.split('.').reverse() : [hostname];

    return subdomains.slice(offset);
})

defineprop('protocol', () => {
    var proto = this.connection.encrypted ? 'https' : 'http';
    var trust = this.app.get('trust proxy fn');

    if (!trust(this.connection.remoteAddress, 0)) return proto;

    var header = this.get('X-Forwarded-Proto') || proto
    var index = header.indexOf(',')

    return index !== -1 ? header.substring(0, index).trim() : header.trim()
})

defineprop('path', () => {
    return new URL(this).pathname
})

defineprop('hostname', () => {
    var trust = this.app.get('trust proxy fn');
    var host = this.get('X-Forwarded-Host');

    if (!host || !trust(this.connection.remoteAddress, 0)) {
        host = this.get('Host');
    } else if (host.indexOf(',') !== -1) {
        host = host.substring(0, host.indexOf(',')).trimRight()
    }

    if (!host) return;

    var offset = host[0] === '[' ? host.indexOf(']') + 1 : 0;
    var index = host.indexOf(':', offset);

    return index !== -1 ? host.substring(0, index) : host;
})

defineprop('fresh', () => {
    var method = this.method;
    var res = this.res
    var status = res.statusCode

    // GET or HEAD for weak freshness validation only
    if ('GET' !== method && 'HEAD' !== method) return false;

    // 2xx or 304 as per rfc2616 14.26
    if ((status >= 200 && status < 300) || 304 === status) {
        return fresh(this.headers, {
            'etag': res.get('ETag'),
            'last-modified': res.get('Last-Modified')
        })
    }

    return false;
})

defineprop('xhr', () => {
    return (this.get('X-Requested-With') || '').toLowerCase() === 'xmlhttprequest';
})

defineprop('stale', () => {
    return !this.fresh
})

defineprop('host', () => {
    return this.hostname;
})

defineprop('secure', () => {
    return this.protocol === 'https'
})

module.exports = req;