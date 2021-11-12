var {
    parse
} = require('url');

function parseurl({
    url,
    _parsedUrl
}) {
    if (url === undefined) return undefined;

    var parsed = _parsedUrl

    if (fresh(url, parsed)) return parsed;

    parsed = fastparse(url)
    parsed._raw = url

    return (_parsedUrl = parsed)
};

function fastparse(str) {
    if (typeof str !== 'string' || str.charCodeAt(0) !== 0x2f) {
        return parse(str)
    }

    var pathname = str
    var query = null
    var search = null

    for (var i = 1; i < str.length; i++) {
        switch (str.charCodeAt(i)) {
            case 0x3f:
                if (search === null) {
                    pathname = str.substring(0, i)
                    query = str.substring(i + 1)
                    search = str.substring(i)
                }
                break
            case 0x09:
            case 0x0a:
            case 0x0c:
            case 0x0d:
            case 0x20:
            case 0x23:
            case 0xa0:
            case 0xfeff:
                return parse(str)
        }
    }

    var url = {
        path: str,
        href: str,
        pathname
    }

    if (search !== null) {
        url.query = query
        url.search = search
    }

    return url
}

function fresh(url, parsedUrl) {
    return typeof parsedUrl === 'object' &&
        parsedUrl !== null &&
        (Url === undefined || parsedUrl instanceof Url) &&
        parsedUrl._raw === url
}

module.exports = parseurl;