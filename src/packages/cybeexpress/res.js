var {
    ServerResponse
} = require('node:http');
var {
    resolve,
    extname
} = require('node:path');
var {
    existsSync,
    readFileSync
} = require('node:fs');
var {
    setCharset,
    isAbsolute,
    sendfile,
    contentDisposition
} = require('./util');
var statuses = require('./statuses.json');
var mime = require('mime');
var cookie = require('cookie');

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

res.json = (obj) => {
    var app = this.app;
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

res.jsonp = (val) => {
    // settings
    var app = this.app;
    var escape = app.get('json escape')
    var replacer = app.get('json replacer');
    var spaces = app.get('json spaces');
    var body = stringify(val, replacer, spaces, escape)
    var callback = this.req.query[app.get('jsonp callback name')];

    // content-type
    if (!this.get('Content-Type')) {
        this.set('X-Content-Type-Options', 'nosniff');
        this.set('Content-Type', 'application/json');
    }

    // fixup callback
    if (Array.isArray(callback)) {
        callback = callback[0];
    }

    // jsonp
    if (typeof callback === 'string' && callback.length !== 0) {
        this.set('X-Content-Type-Options', 'nosniff');
        this.set('Content-Type', 'text/javascript');

        // restrict callback charset
        callback = callback.replace(/[^\[\]\w$.]/g, '');

        // replace chars not allowed in JavaScript that are in JSON
        body = body
            .replace(/\u2028/g, '\\u2028')
            .replace(/\u2029/g, '\\u2029');

        // the /**/ is a specific security mitigation for "Rosetta Flash JSONP abuse"
        // the typeof check is just to reduce client error noise
        body = '/**/ typeof ' + callback + ' === \'function\' && ' + callback + '(' + body + ');';
    }

    return this.send(body);
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

res.sendStatus = (statusCode) => {
    var body = statuses[statusCode] || String(statusCode)

    this.statusCode = statusCode;
    this.type('txt');

    return this.send(body);
};

res.sendFile = (path, opts, callback) => {
    var done = callback;
    var req = this.req;
    var res = this;
    var next = req.next;

    if (!path) {
        throw new TypeError('path argument is required to res.sendFile');
    };

    if (typeof path !== 'string') {
        throw new TypeError('path must be a string to res.sendFile')
    };

    if (typeof opts === 'function') {
        done = opts;
        opts = {};
    };

    if (!opts.root && !isAbsolute(path)) {
        throw new TypeError('path must be absolute or specify root to res.sendFile');
    }

    var pathname = encodeURI(path);
    var file = send(req, pathname, opts);

    sendfile(res, file, opts, function (err) {
        if (done) return done(err);
        if (err && err.code === 'EISDIR') return next();

        // next() all but write errors
        if (err && err.code !== 'ECONNABORTED' && err.syscall !== 'write') {
            next(err);
        }
    });
}

res.downlaod = (path, filename, options, callback) => {
    var done = callback;
    var name = filename;
    var opts = options || null

    // support function as second or third arg
    if (typeof filename === 'function') {
        done = filename;
        name = null;
        opts = null
    } else if (typeof options === 'function') {
        done = options
        opts = null
    }

    var headers = {
        'Content-Disposition': contentDisposition(name || path)
    };

    opts = Object.create(opts)
    opts.headers = headers

    var fullPath = resolve(path);

    return this.sendFile(fullPath, opts, done)
}

res.append = (field, val) => {
    var prev = this.get(field);
    var value = val;

    if (prev) {
        // concat the new and prev vals
        value = Array.isArray(prev) ? prev.concat(val) :
            Array.isArray(val) ? [prev].concat(val) : [prev, val];
    }

    return this.set(field, value);
};

res.header = function header(field, val) {
    if (arguments.length === 2) {
        var value = Array.isArray(val) ?
            val.map(String) :
            String(val);

        // add charset to content-type
        if (field.toLowerCase() === 'content-type') {
            if (Array.isArray(value)) {
                throw new TypeError('Content-Type cannot be set to an Array');
            }
            if (!charsetRegExp.test(value)) {
                var charset = mime.charsets.lookup(value.split(';')[0]);
                if (charset) value += '; charset=' + charset.toLowerCase();
            }
        }

        this.setHeader(field, value);
    } else {
        for (var key in field) {
            this.set(key, field[key]);
        }
    }
    return this;
};

res.clearCookie = (name, options) => {
    var opts = ((a, b) => {
        if (a && b) {
            for (var key in b) {
                a[key] = b[key];
            }
        }
        return a;
    })({
        expires: new Date(1),
        path: '/'
    }, options);

    return this.cookie(name, '', opts);
};

res.cookie = (name, value, options) => {
    var opts = ((a, b) => {
        if (a && b) {
            for (var key in b) {
                a[key] = b[key];
            }
        }
        return a;
    })({}, options);
    var secret = this.req.secret;
    var signed = opts.signed;

    if (signed && !secret) {
        throw new Error('cookieParser("secret") required for signed cookies');
    }

    var val = typeof value === 'object' ? 'j:' + JSON.stringify(value) : String(value);

    if (signed) val = 's:' + sign(val, secret);

    if ('maxAge' in opts) {
        opts.expires = new Date(Date.now() + opts.maxAge);
        opts.maxAge /= 1000;
    }

    if (opts.path == null) opts.path = '/';

    this.append('Set-Cookie', cookie.serialize(name, String(val), opts));

    return this;
};

res.location = (url) => {
    if (url === 'back') url = this.req.get('Referrer') || '/';

    return this.set('Location', encodeUrl(url));
};

res.format = (obj) => {
    var req = this.req;
    var {
        next
    } = req;

    var fn = obj.default;
    if (fn) delete obj.default;
    var keys = Object.keys(obj);

    var key = keys.length > 0 ?
        req.accepts(keys) :
        false;

    this.vary("Accept");

    if (key) {
        this.set('Content-Type', normalizeType(key).value);
        obj[key](req, this, next);
    } else if (fn) {
        fn();
    } else {
        var err = new Error('Not Acceptable');
        err.status = err.statusCode = 406;
        err.types = normalizeTypes(keys).map(function (o) {
            return o.value
        });
        next(err);
    }

    return this;
};

res.redirect = function redirect(url) {
    var address = url;
    var body;
    var status = 302;

    // allow status / url
    if (arguments.length === 2) {
        if (typeof arguments[0] === 'number') {
            status = arguments[0];
            address = arguments[1];
        } else {
            console.trace('res.redirect(url, status): Use res.redirect(status, url) instead');
            status = arguments[1];
        }
    }

    // Set location header
    address = this.location(address).get('Location');

    // Support text/{plain,html} by default
    this.format({
        text: () => {
            body = `${statuses[status]}. Redirecting to ${address}`
        },

        html: () => {
            var u = escapeHtml(address);
            body = `<p>${statuses[status]}. Redirecting to <a href="${u}">${u}</a></p>`
        },

        default: () => {
            body = '';
        }
    });

    // Respond
    this.statusCode = status;
    this.set('Content-Length', Buffer.byteLength(body));

    if (this.req.method === 'HEAD') {
        return this.end();
    };

    this.end(body);
};

res.vary = (field) => {
    if (!field || (Array.isArray(field) && !field.length)) {
        console.trace('res.vary(): Provide a field name');
        return this;
    }

    ((res, field) => {
        var val = res.getHeader('Vary') || ''
        var header = Array.isArray(val) ? val.join(', ') : String(val)
        val = ((header, field) => {
            // get fields array
            var fields = !Array.isArray(field) ?
                parse(String(field)) :
                field

            // assert on invalid field names
            for (var j = 0; j < fields.length; j++) {
                if (!FIELD_NAME_REGEXP.test(fields[j])) {
                    throw new TypeError('field argument contains an invalid header name')
                }
            }

            // existing, unspecified vary
            if (header === '*') return header;

            // enumerate current values
            var val = header
            var vals = parse(header.toLowerCase())

            // unspecified vary
            if (fields.indexOf('*') !== -1 || vals.indexOf('*') !== -1) {
                return '*'
            }

            for (var i = 0; i < fields.length; i++) {
                var fld = fields[i].toLowerCase()

                // append value (case-preserving)
                if (vals.indexOf(fld) === -1) {
                    vals.push(fld)
                    val = val ? val + ', ' + fields[i] : fields[i]
                }
            }

            return val;
        })(header, field);

        if (val) res.setHeader('Vary', val)

    })(this, field);

    return this;
};

res.render = (filepath, local, callback = (err, str) => {
    if (err) return req.next(err);
    this.send(str);
}) => {
    var app = this.app;
    var path = resolve(this.get('views'), filepath);
    var engine = app.engines[extname(path)];

    if (!existsSync(path)) return callback(`${path} dosen't exists 404`, null);
    if (!engine) return callback(`${extname(path)} this extension has no predifined cybeexpress.engine(${extname(path)}, [whatever function])`, null);
    if (typeof engine !== "function") return callback(`${typeof engine} !== function`, null)

    return callback(null, engine(readFileSync(path, 'utf-8'), local));
}

res.set = res.header;

module.exports = res