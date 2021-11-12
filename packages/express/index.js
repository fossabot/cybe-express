var {
    EventEmitter
} = require('events');

var req = require('./request');
var res = require('./response');
var Router = require('./router');
var proto = require('./application');
var Route = require('./router/route');

function mixin(dest, src, redefine) {
    if (!dest) {
        throw new TypeError('argument dest is required')
    }

    if (!src) {
        throw new TypeError('argument src is required')
    }

    if (redefine === undefined) {
        // Default to true
        redefine = true
    }

    Object.getOwnPropertyNames(src).forEach((name) => {
        // Skip descriptor
        if (!redefine && hasOwnProperty.call(dest, name))
            return;

        // Copy descriptor
        Object.defineProperty(dest, name, Object.getOwnPropertyDescriptor(src, name))
    })

    return dest;
}

function createApplication() {
    var app = function (req, res, next) {
        app.handle(req, res, next);
    };

    mixin(app, EventEmitter.prototype, false);
    mixin(app, proto, false);

    // expose the prototype that will get set on requests
    app.request = Object.create(req, {
        app: {
            configurable: true,
            enumerable: true,
            writable: true,
            value: app
        }
    })

    // expose the prototype that will get set on responses
    app.response = Object.create(res, {
        app: {
            configurable: true,
            enumerable: true,
            writable: true,
            value: app
        }
    })

    app.init(app);
    return app;
}

exports.createapp = createApplication;
exports.application = proto;
exports.request = req;
exports.response = res;
exports.Route = Route;
exports.Router = Router;