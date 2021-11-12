var modules = {};

function loadModule(moduleName) {
    var module = modules[moduleName];

    if (module !== undefined) return module;

    switch (moduleName) {
        case 'charset':
            module = require('./lib/charset');
            break;
        case 'encoding':
            module = require('./lib/encoding');
            break;
        case 'language':
            module = require('./lib/language');
            break;
        case 'mediaType':
            module = require('./lib/mediaType');
            break;
        default:
            throw new Error('Cannot find module \'' + moduleName + '\'');
    }

    modules[moduleName] = module;
    return module;
}

module.exports = class Negotiator {
    constructor(request) {
        this.request = request;
        this.preferredCharset = this.charset;
        this.preferredCharsets = this.charsets;
        this.preferredEncoding = this.encoding;
        this.preferredEncodings = this.encodings;
        this.preferredLanguage = this.language;
        this.preferredLanguages = this.languages;
        this.preferredMediaType = this.mediaType;
        this.preferredMediaTypes = this.mediaTypes;
    }
    charset(available) {
        var set = this.charsets(available);
        return set && set[0];
    }
    charset(available) {
        var preferredCharsets = loadModule('charset').preferredCharsets;
        return preferredCharsets(this.request.headers['accept-charset'], available);
    };
    encoding(available) {
        var set = this.encodings(available);
        return set && set[0];
    };
    encodings(available) {
        var preferredEncodings = loadModule('encoding').preferredEncodings;
        return preferredEncodings(this.request.headers['accept-encoding'], available);
    };
    language(available) {
        var set = this.languages(available);
        return set && set[0];
    };
    languages(available) {
        var preferredLanguages = loadModule('language').preferredLanguages;
        return preferredLanguages(this.request.headers['accept-language'], available);
    };
    mediaType(available) {
        var set = this.mediaTypes(available);
        return set && set[0];
    };
    mediaTypes(available) {
        var {preferredMediaTypes} = loadModule('mediaType');
        return preferredMediaTypes(this.request.headers.accept, available);
    };
};