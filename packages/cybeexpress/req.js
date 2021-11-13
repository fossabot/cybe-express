var {
    IncomingMessage
} = require('http');
var accepts = require('accepts');

var req = Object.create(IncomingMessage.prototype);

req.get = (header) => {
    if (!header) throw new TypeError('header argument is required to req.get');

    if (typeof header !== 'string') throw new TypeError('header must be a string to req.get');

    var lower = header.toLowerCase();

    switch (lower) {
      case 'referer':
      case 'referrer':
        return this.headers.referrer
          || this.headers.referer;
      default:
        return this.headers[lower];
    }
}

req.accepts = () => {
  var accept = accepts(this);
  return accept.types.apply(accept, arguments);
};

module.exports = req;