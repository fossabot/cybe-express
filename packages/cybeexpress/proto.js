var {
  compileQueryParser,
  compileETag
} = require('./util');
var app = {};

app.init = function init() {
  this.cache = {};
  this.engines = {};
  this.settings = {};

  this.defaultConfiguration();
};

app.defaultConfiguration = function defaultConfiguration() {
  var env = process.env.NODE_ENV || 'development';

  // default settings
  this.enable('x-powered-by');
  this.set('etag', 'weak');
  this.set('env', env);
  this.set('query parser', 'extended');
  this.set('subdomain offset', 2);
  this.set('trust proxy', false);

  if (global.debug) console.debug('booting in %s mode', env);

  this.on('mount', ({
    settings,
    request,
    response,
    engines
  }) => {
    // inherit trust proxy
    if (this.settings[trustProxyDefaultSymbol] === true &&
      typeof settings['trust proxy fn'] === 'function') {
      delete this.settings['trust proxy'];
      delete this.settings['trust proxy fn'];
    }

    // inherit protos
    this.request.__proto__ = request
    this.response.__proto__ = response
    this.engines.__proto__ = engines
    this.settings.__proto__ = settings
  });

  // setup locals
  this.locals = Object.create(null);

  this.mountpath = '/';
  this.locals.settings = this.settings;

  // default configuration
  this.set('views', resolve(process.cwd(), 'views'));
  this.set('jsonp callback name', 'callback');

  if (env === 'production') this.enable('view cache');
};

app.set = function set(setting, val) {
  if (arguments.length === 1) {
    return this.settings[setting];
  }

  if (global.debug) console.debug('set "%s" to %o', setting, val);

  this.settings[setting] = val;

  switch (setting) {
    case 'etag':
      this.set('etag fn', compileETag(val));
      break;
    case 'query parser':
      this.set('query parser fn', compileQueryParser(val));
      break;
  }

  return this;
};

app.enable = function enable(setting) {
  return this.set(setting, true);
};

exports = module.exports = app;