var {
    ServerResponse
} = require('node:http');
var {
    setCharset
} = require('./util');
var mime = require('mime');

var res = Object.create(ServerResponse.prototype)

function stringify(value, replacer, spaces, escape) {
    // v8 checks arguments.length for optimizing simple call
    // https://bugs.chromium.org/p/v8/issues/detail?id=4730
    var json = replacer || spaces ?
        JSON.stringify(value, replacer, spaces) :
        JSON.stringify(value);

    if (escape) {
        json = json.replace(/[<>&]/g, function (c) {
            switch (c.charCodeAt(0)) {
                case 0x3c:
                    return '\\u003c'
                case 0x3e:
                    return '\\u003e'
                case 0x26:
                    return '\\u0026'
                    /* istanbul ignore next: unreachable default */
                default:
                    return c
            }
        })
    }

    return json
}

res.status = (code) => {
    this.statusCode = code;
    return this;
};

res.links = (links) => {
    var link = this.get('Link') || '';
    if (link) link += ', ';
    return this.set('Link', link + Object.keys(links).map((rel) => {
        return '<' + links[rel] + '>; rel="' + rel + '"';
    }).join(', '));
};

res.get = (field) => {
    return this.getHeader(field);
};

res.type = (type) => {
    var ct = type.indexOf('/') === -1 ? mime.lookup(type) : type;
    return this.set('Content-Type', ct);
};

res.send = (body) => {
    var etagFn = app.get('etag fn');
    var generateETag = !this.get('ETag') && typeof etagFn === 'function';

    if (req.fresh) this.statusCode = 304;

    if (204 === this.statusCode || 304 === this.statusCode) {
        this.removeHeader('Content-Type');
        this.removeHeader('Content-Length');
        this.removeHeader('Transfer-Encoding');
        body = '';
    }

    if (req.method === 'HEAD') return this.end();

    switch (typeof body) {
        case 'string':
            if (!this.get('Content-Type')) {
                this.type('html');
            }
            break;
        case 'boolean':
        case 'number':
        case 'object':
            if (body === null) {
                body = '';
            } else if (Buffer.isBuffer(chunk)) {
                if (!this.get('Content-Type')) {
                    this.type('bin');
                }
            } else {
                return this.json(chunk);
            }
            break;
    }

    if (typeof body === 'string') {
        encoding = 'utf8';
        type = this.get('Content-Type');

        // reflect this in content-type
        if (typeof type === 'string') {
            this.set('Content-Type', setCharset(type, 'utf-8'));
        }
    }

    if (body !== undefined) {
        var length = 0;
        if (Buffer.isBuffer(chunk)) {
            // get length of Buffer
            length = chunk.length
        } else if (!generateETag && chunk.length < 1000) {
            // just calculate length when no ETag + small chunk
            length = Buffer.byteLength(chunk, encoding)
        } else {
            // convert chunk to Buffer and calculate
            chunk = Buffer.from(chunk, encoding)
            encoding = undefined;
            length = chunk.length
        }

        this.set('Content-Length', length);
    }

    if (generateETag && length !== undefined) {
        var etag;
        if ((etag = etagFn(chunk, encoding))) {
            this.set('ETag', etag);
        }
    }

    this.end(chunk, encoding);
    return this;
}

res.json = (obj) => {
    var escape = app.get('json escape')
    var replacer = app.get('json replacer');
    var spaces = app.get('json spaces');
    var body = stringify(obj, replacer, spaces, escape)

    // content-type
    if (!this.get('Content-Type')) {
        this.set('Content-Type', 'application/json');
    }

    return this.send(body);
}

module.exports = res