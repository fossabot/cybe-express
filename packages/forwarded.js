function forwarded(req) {
    if (!req) {
        throw new TypeError('argument req is required')
    }

    var proxyAddrs = parse(req.headers['x-forwarded-for'] || '')
    var socketAddr = getSocketAddr(req)
    var addrs = [socketAddr].concat(proxyAddrs)

    return addrs
}

function getSocketAddr(req) {
    return req.socket ?
        req.socket.remoteAddress :
        req.connection.remoteAddress
}

function parse(header) {
    var end = header.length
    var list = []
    var start = header.length

    for (var i = header.length - 1; i >= 0; i--) {
        switch (header.charCodeAt(i)) {
            case 0x20:
                if (start === end) {
                    start = end = i
                }
                break
            case 0x2c:
                if (start !== end) {
                    list.push(header.substring(start, end))
                }
                start = end = i
                break
            default:
                start = i
                break
        }
    }

    if (start !== end) {
        list.push(header.substring(start, end))
    }

    return list
}

module.exports = forwarded;