var qs = require('../qs');
var url = require('node:url');

function compileQueryParser(val) {
    var fn;

    if (typeof val === 'function') {
        return val;
    }

    switch (val) {
        case true:
        case 'simple':
            fn = () => {
                return url.parse(this.url).query;
            };
            break;
        case false:
            fn = () => {};
            break;
        case 'extended':
            fn = () => {
                return qs.parse(str, {
                    allowPrototypes: true
                });
            };
            break;
        default:
            throw new TypeError('unknown value for query parser function: ' + val);
    }

    return fn;
}

function createETagGenerator(options) {
    return function generateETag(body, encoding) {
        var buf = !Buffer.isBuffer(body) ?
            Buffer.from(body, encoding) :
            body

        return etag(buf, options)
    }
}

function compileETag(val) {
    var fn;

    if (typeof val === 'function') {
        return val;
    }

    switch (val) {
        case true:
        case 'weak':
            fn = createETagGenerator({
                weak: true
            });
            break;
        case false:
            break;
        case 'strong':
            fn = createETagGenerator({
                weak: false
            });
            break;
        default:
            throw new TypeError('unknown value for etag function: ' + val);
    }

    return fn;
}

module.exports = {
    compileQueryParser,
    compileETag
}