require('../helpers');

var {
    EventEmitter
} = require('node:events');
var proto = require('./proto');
var req = require('./req');
var res = require('./res');

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

    Object.getOwnPropertyNames(src).forEach(function forEachOwnPropertyName(name) {
        if (!redefine && hasOwnProperty.call(dest, name)) {
            // Skip descriptor
            return
        }

        // Copy descriptor
        var descriptor = Object.getOwnPropertyDescriptor(src, name)
        Object.defineProperty(dest, name, descriptor)
    })

    return dest
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

    app.init();
    return app;
}

exports = module.exports = createApplication;