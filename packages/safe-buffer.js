var {
    Buffer
} = require('node:buffer')

function copyProps(src, dst) {
    for (var key in src) {
        dst[key] = src[key]
    }
}

if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
    module.exports = Buffer;
} else {
    // Copy properties from require('buffer')
    copyProps(Buffer, exports)
    exports.Buffer = SafeBuffer
}

function SafeBuffer(arg, encodingOrOffset, length) {
    return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.prototype = Object.create(Buffer.prototype)

copyProps(Buffer, SafeBuffer)

SafeBuffer.from = function (arg, encodingOrOffset, length) {
    if (typeof arg === 'number')
        throw new TypeError('Argument must not be a number');

    return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.alloc = function (size, fill, encoding) {
    if (typeof size !== 'number')
        throw new TypeError('Argument must be a number')

    var buf = Buffer(size);

    if (fill === undefined) {
        buf.fill(0);
        return buf;
    };

    if (typeof encoding !== 'string') {
        buf.fill(fill);
        return buf;
    };

    buf.fill(fill, encoding)
    return buf;
}

SafeBuffer.allocUnsafe = function (size) {
    if (typeof size !== 'number') {
        throw new TypeError('Argument must be a number')
    }
    return Buffer(size)
}

SafeBuffer.allocUnsafeSlow = function (size) {
    if (typeof size !== 'number') {
        throw new TypeError('Argument must be a number')
    }
    return buffer.SlowBuffer(size)
}