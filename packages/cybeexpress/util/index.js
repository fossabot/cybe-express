var qs = require('../qs');
var url = require('node:url');
var contentType = require('content-type');

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

function setCharset(type, charset) {
    if (!type || !charset) {
        return type;
    }

    // parse type
    var parsed = contentType.parse(type);

    // set charset
    parsed.parameters.charset = charset;

    // format type
    return contentType.format(parsed);
};

function isAbsolute(path) {
    if ('/' === path[0]) return true;
    if (':' === path[1] && ('\\' === path[2] || '/' === path[2])) return true; // Windows device path
    if ('\\\\' === path.substring(0, 2)) return true;
}

function sendfile(res, file, options, callback) {
    var done = false;
    var streaming;

    // request aborted
    function onaborted() {
        if (done) return;
        done = true;

        var err = new Error('Request aborted');
        err.code = 'ECONNABORTED';
        callback(err);
    }

    // directory
    function ondirectory() {
        if (done) return;
        done = true;

        var err = new Error('EISDIR, read');
        err.code = 'EISDIR';
        callback(err);
    }

    // errors
    function onerror(err) {
        if (done) return;
        done = true;
        callback(err);
    }

    // ended
    function onend() {
        if (done) return;
        done = true;
        callback();
    }

    // file
    function onfile() {
        streaming = false;
    }

    // finished
    function onfinish(err) {
        if (err && err.code === 'ECONNRESET') return onaborted();
        if (err) return onerror(err);
        if (done) return;

        setImmediate(function () {
            if (streaming !== false && !done) {
                onaborted();
                return;
            }

            if (done) return;
            done = true;
            callback();
        });
    }

    // streaming
    function onstream() {
        streaming = true;
    }

    file.on('directory', ondirectory);
    file.on('end', onend);
    file.on('error', onerror);
    file.on('file', onfile);
    file.on('stream', onstream);
    onFinished(res, onfinish);

    if (options.headers) {
        // set headers on successful transfer
        file.on('headers', function headers(res) {
            var obj = options.headers;
            var keys = Object.keys(obj);

            for (var i = 0; i < keys.length; i++) {
                var k = keys[i];
                res.setHeader(k, obj[k]);
            }
        });
    }

    // pipe
    file.pipe(res);
}

var ENCODE_URL_ATTR_CHAR_REGEXP = /[\x00-\x20"'()*,/:;<=>?@[\\\]{}\x7f]/g // eslint-disable-line no-control-regex

/**
 * RegExp to match percent encoding escape.
 * @private
 */

var HEX_ESCAPE_REGEXP = /%[0-9A-Fa-f]{2}/
var HEX_ESCAPE_REPLACE_REGEXP = /%([0-9A-Fa-f]{2})/g

/**
 * RegExp to match non-latin1 characters.
 * @private
 */

var NON_LATIN1_REGEXP = /[^\x20-\x7e\xa0-\xff]/g

/**
 * RegExp to match quoted-pair in RFC 2616
 *
 * quoted-pair = "\" CHAR
 * CHAR        = <any US-ASCII character (octets 0 - 127)>
 * @private
 */

var QESC_REGEXP = /\\([\u0000-\u007f])/g // eslint-disable-line no-control-regex

/**
 * RegExp to match chars that must be quoted-pair in RFC 2616
 * @private
 */

var QUOTE_REGEXP = /([\\"])/g

/**
 * RegExp for various RFC 2616 grammar
 *
 * parameter     = token "=" ( token | quoted-string )
 * token         = 1*<any CHAR except CTLs or separators>
 * separators    = "(" | ")" | "<" | ">" | "@"
 *               | "," | ";" | ":" | "\" | <">
 *               | "/" | "[" | "]" | "?" | "="
 *               | "{" | "}" | SP | HT
 * quoted-string = ( <"> *(qdtext | quoted-pair ) <"> )
 * qdtext        = <any TEXT except <">>
 * quoted-pair   = "\" CHAR
 * CHAR          = <any US-ASCII character (octets 0 - 127)>
 * TEXT          = <any OCTET except CTLs, but including LWS>
 * LWS           = [CRLF] 1*( SP | HT )
 * CRLF          = CR LF
 * CR            = <US-ASCII CR, carriage return (13)>
 * LF            = <US-ASCII LF, linefeed (10)>
 * SP            = <US-ASCII SP, space (32)>
 * HT            = <US-ASCII HT, horizontal-tab (9)>
 * CTL           = <any US-ASCII control character (octets 0 - 31) and DEL (127)>
 * OCTET         = <any 8-bit sequence of data>
 * @private
 */

var PARAM_REGEXP = /;[\x09\x20]*([!#$%&'*+.0-9A-Z^_`a-z|~-]+)[\x09\x20]*=[\x09\x20]*("(?:[\x20!\x23-\x5b\x5d-\x7e\x80-\xff]|\\[\x20-\x7e])*"|[!#$%&'*+.0-9A-Z^_`a-z|~-]+)[\x09\x20]*/g // eslint-disable-line no-control-regex
var TEXT_REGEXP = /^[\x20-\x7e\x80-\xff]+$/
var TOKEN_REGEXP = /^[!#$%&'*+.0-9A-Z^_`a-z|~-]+$/

/**
 * RegExp for various RFC 5987 grammar
 *
 * ext-value     = charset  "'" [ language ] "'" value-chars
 * charset       = "UTF-8" / "ISO-8859-1" / mime-charset
 * mime-charset  = 1*mime-charsetc
 * mime-charsetc = ALPHA / DIGIT
 *               / "!" / "#" / "$" / "%" / "&"
 *               / "+" / "-" / "^" / "_" / "`"
 *               / "{" / "}" / "~"
 * language      = ( 2*3ALPHA [ extlang ] )
 *               / 4ALPHA
 *               / 5*8ALPHA
 * extlang       = *3( "-" 3ALPHA )
 * value-chars   = *( pct-encoded / attr-char )
 * pct-encoded   = "%" HEXDIG HEXDIG
 * attr-char     = ALPHA / DIGIT
 *               / "!" / "#" / "$" / "&" / "+" / "-" / "."
 *               / "^" / "_" / "`" / "|" / "~"
 * @private
 */

var EXT_VALUE_REGEXP = /^([A-Za-z0-9!#$%&+\-^_`{}~]+)'(?:[A-Za-z]{2,3}(?:-[A-Za-z]{3}){0,3}|[A-Za-z]{4,8}|)'((?:%[0-9A-Fa-f]{2}|[A-Za-z0-9!#$&+.^_`|~-])+)$/

/**
 * RegExp for various RFC 6266 grammar
 *
 * disposition-type = "inline" | "attachment" | disp-ext-type
 * disp-ext-type    = token
 * disposition-parm = filename-parm | disp-ext-parm
 * filename-parm    = "filename" "=" value
 *                  | "filename*" "=" ext-value
 * disp-ext-parm    = token "=" value
 *                  | ext-token "=" ext-value
 * ext-token        = <the characters in token, followed by "*">
 * @private
 */

var DISPOSITION_TYPE_REGEXP = /^([!#$%&'*+.0-9A-Z^_`a-z|~-]+)[\x09\x20]*(?:$|;)/ // eslint-disable-line no-control-regex

/**
 * Create an attachment Content-Disposition header.
 *
 * @param {string} [filename]
 * @param {object} [options]
 * @param {string} [options.type=attachment]
 * @param {string|boolean} [options.fallback=true]
 * @return {string}
 * @public
 */

function contentDisposition(filename, options) {
    var opts = options || {}

    // get type
    var type = opts.type || 'attachment'

    // get parameters
    var params = createparams(filename, opts.fallback)

    // format into string
    return format(new ContentDisposition(type, params))
}

/**
 * Create parameters object from filename and fallback.
 *
 * @param {string} [filename]
 * @param {string|boolean} [fallback=true]
 * @return {object}
 * @private
 */

function createparams(filename, fallback) {
    if (filename === undefined) {
        return
    }

    var params = {}

    if (typeof filename !== 'string') {
        throw new TypeError('filename must be a string')
    }

    // fallback defaults to true
    if (fallback === undefined) {
        fallback = true
    }

    if (typeof fallback !== 'string' && typeof fallback !== 'boolean') {
        throw new TypeError('fallback must be a string or boolean')
    }

    if (typeof fallback === 'string' && NON_LATIN1_REGEXP.test(fallback)) {
        throw new TypeError('fallback must be ISO-8859-1 string')
    }

    // restrict to file base name
    var name = basename(filename)

    // determine if name is suitable for quoted string
    var isQuotedString = TEXT_REGEXP.test(name)

    // generate fallback name
    var fallbackName = typeof fallback !== 'string' ?
        fallback && getlatin1(name) :
        basename(fallback)
    var hasFallback = typeof fallbackName === 'string' && fallbackName !== name

    // set extended filename parameter
    if (hasFallback || !isQuotedString || HEX_ESCAPE_REGEXP.test(name)) {
        params['filename*'] = name
    }

    // set filename parameter
    if (isQuotedString || hasFallback) {
        params.filename = hasFallback ?
            fallbackName :
            name
    }

    return params
}

/**
 * Format object to Content-Disposition header.
 *
 * @param {object} obj
 * @param {string} obj.type
 * @param {object} [obj.parameters]
 * @return {string}
 * @private
 */

function format(obj) {
    var parameters = obj.parameters
    var type = obj.type

    if (!type || typeof type !== 'string' || !TOKEN_REGEXP.test(type)) {
        throw new TypeError('invalid type')
    }

    // start with normalized type
    var string = String(type).toLowerCase()

    // append parameters
    if (parameters && typeof parameters === 'object') {
        var param
        var params = Object.keys(parameters).sort()

        for (var i = 0; i < params.length; i++) {
            param = params[i]

            var val = param.substr(-1) === '*' ?
                ustring(parameters[param]) :
                qstring(parameters[param])

            string += '; ' + param + '=' + val
        }
    }

    return string
}

/**
 * Decode a RFC 6987 field value (gracefully).
 *
 * @param {string} str
 * @return {string}
 * @private
 */

function decodefield(str) {
    var match = EXT_VALUE_REGEXP.exec(str)

    if (!match) {
        throw new TypeError('invalid extended field value')
    }

    var charset = match[1].toLowerCase()
    var encoded = match[2]
    var value

    // to binary string
    var binary = encoded.replace(HEX_ESCAPE_REPLACE_REGEXP, pdecode)

    switch (charset) {
        case 'iso-8859-1':
            value = getlatin1(binary)
            break
        case 'utf-8':
            value = Buffer.from(binary, 'binary').toString('utf8')
            break
        default:
            throw new TypeError('unsupported charset in extended field')
    }

    return value
}

function getlatin1(val) {
    // simple Unicode -> ISO-8859-1 transformation
    return String(val).replace(NON_LATIN1_REGEXP, '?')
}


function pdecode(str, hex) {
    return String.fromCharCode(parseInt(hex, 16))
}

function pencode(char) {
    return '%' + String(char)
        .charCodeAt(0)
        .toString(16)
        .toUpperCase()
}

function qstring(val) {
    var str = String(val)

    return '"' + str.replace(QUOTE_REGEXP, '\\$1') + '"'
}

function ustring(val) {
    var str = String(val)

    var encoded = encodeURIComponent(str)
        .replace(ENCODE_URL_ATTR_CHAR_REGEXP, pencode)

    return 'UTF-8\'\'' + encoded
}

function ContentDisposition(type, parameters) {
    this.type = type
    this.parameters = parameters
}

module.exports = {
    compileQueryParser,
    compileETag,
    setCharset,
    isAbsolute,
    sendfile,
    ContentDisposition
}