var {
    ReadStream
} = require('node:fs')
var Stream = require('node:stream')

/**
 * Module exports.
 * @public
 */

module.exports = destroy

/**
 * Destroy a stream.
 *
 * @param {object} stream
 * @public
 */

function destroy(stream) {
    if (stream instanceof ReadStream) {
        return destroyReadStream(stream)
    }

    if (!(stream instanceof Stream)) {
        return stream
    }

    if (typeof stream.destroy === 'function') {
        stream.destroy()
    }

    return stream
}

/**
 * Destroy a ReadStream.
 *
 * @param {object} stream
 * @private
 */

function destroyReadStream(stream) {
    stream.destroy()

    if (typeof stream.close === 'function') {
        // node.js core bug work-around
        stream.on('open', onOpenClose)
    }

    return stream
}

/**
 * On open handler to close stream.
 * @private
 */

function onOpenClose() {
    if (typeof this.fd === 'number') {
        // actually close down the fd
        this.close()
    }
}