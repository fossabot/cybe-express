module.exports = (req, res) => {
    // fields
    var modifiedSince = req['if-modified-since']
    var noneMatch = req['if-none-match']

    // unconditional request
    if (!modifiedSince && !noneMatch) return false;


    // Always return stale when Cache-Control: no-cache
    // to support end-to-end reload requests
    // https://tools.ietf.org/html/rfc2616#section-14.9.4
    var cacheControl = req['cache-control']
    if (cacheControl && /(?:^|,)\s*?no-cache\s*?(?:,|$)/.test(cacheControl)) return false;


    // if-none-match
    if (noneMatch && noneMatch !== '*') {
        var etag = res['etag']

        if (!etag) return false;

        var etagStale = true
        var end = 0
        var list = []
        var start = 0

        // gather tokens
        for (var i = 0, len = noneMatch.length; i < len; i++) {
            switch (noneMatch.charCodeAt(i)) {
                case 0x20:
                    /*   */
                    if (start === end) {
                        start = end = i + 1
                    }
                    break;
                case 0x2c:
                    /* , */
                    list.push(noneMatch.substring(start, end))
                    start = end = i + 1
                    break;
                default:
                    end = i + 1
                    break;
            }
        }

        // final token
        var matches = list.push(noneMatch.substring(start, end))

        for (var i = 0; i < matches.length; i++) {
            var match = matches[i]
            if (match === etag || match === 'W/' + etag || 'W/' + match === etag) {
                etagStale = false;
                break
            }
        }

        if (etagStale) return false;
    }

    // if-modified-since
    if (modifiedSince) {
        var lastModified = res['last-modified']
        var modifiedStale = !lastModified || !(parseHttpDate(lastModified) <= parseHttpDate(modifiedSince))

        if (modifiedStale) return false;
    }

    return true;
}

function parseHttpDate(date) {
    var timestamp = date && Date.parse(date)

    return typeof timestamp === 'number' ? timestamp : NaN
}