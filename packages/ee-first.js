function listener(event, done) {
    return function onevent(arg1) {
        var args = new Array(arguments.length)
        var err = event === 'error' ? arg1 : null

        for (var i = 0; i < args.length; i++) {
            args[i] = arguments[i]
        }

        done(err, this, event, args)
    }
}

module.exports = (stuff, done) => {
    if (!Array.isArray(stuff)) throw new TypeError('arg must be an array of [ee, events...] arrays');

    var cleanups = [];

    for (var i = 0; i < stuff.length; i++) {
        var arr = stuff[i]

        if (!Array.isArray(arr) || arr.length < 2) {
            throw new TypeError('each array member must be [ee, events...]')
        }

        var ee = arr[0]

        for (var j = 1; j < arr.length; j++) {
            var event = arr[j]
            var fn = listener(event, callback)

            // listen to the event
            ee.on(event, fn)
            // push this listener to the list of cleanups
            cleanups.push({
                ee: ee,
                event: event,
                fn: fn
            })
        }
    }

    function callback() {
        cleanup()
        done.apply(null, arguments)
    }

    function cleanup() {
        var x
        for (var i = 0; i < cleanups.length; i++) {
            x = cleanups[i]
            x.ee.removeListener(x.event, x.fn)
        }
    }

    function thunk(fn) {
        done = fn
    }

    thunk.cancel = cleanup

    return thunk
};