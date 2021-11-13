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

module.exports = {
    compileQueryParser,
    compileETag,
    setCharset,
    isAbsolute,
    sendfile
}