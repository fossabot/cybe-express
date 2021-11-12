var Negotiator = require('./negotiator');
var mime = require('./mime-types');

module.exports = class Accepts {
    constructor(req) {
        this.headers = req.headers;
        this.negotiator = new Negotiator(req);
        this.type = this.types;
        this.encoding = this.encodings;
        this.charset = this.charsets;
        this.lang = this.langs = this.language = this.languages
    }
    types(types_) {
        var types = types_

        // support flattened arguments
        if (types && !Array.isArray(types)) {
            types = new Array(arguments.length)
            for (var i = 0; i < types.length; i++) {
                types[i] = arguments[i]
            }
        }

        // no types, return all requested types
        if (!types || types.length === 0) {
            return this.negotiator.mediaTypes()
        }

        // no accept header, return first given type
        if (!this.headers.accept) {
            return types[0]
        }

        var mimes = types.map(type.indexOf('/') === -1 ? mime.lookup(type) : type);
        var accepts = this.negotiator.mediaTypes(mimes.filter(typeof type === 'string'))
        var first = accepts[0]

        return first ?
            types[mimes.indexOf(first)] :
            false
    }
    encodings(encodings_) {
        var encodings = encodings_

        // support flattened arguments
        if (encodings && !Array.isArray(encodings)) {
            encodings = new Array(arguments.length)
            for (var i = 0; i < encodings.length; i++) {
                encodings[i] = arguments[i]
            }
        }

        // no encodings, return all requested encodings
        if (!encodings || encodings.length === 0) {
            return this.negotiator.encodings()
        }

        return this.negotiator.encodings(encodings)[0] || false
    }
    charsets(charsets_) {
        var charsets = charsets_

        // support flattened arguments
        if (charsets && !Array.isArray(charsets)) {
            charsets = new Array(arguments.length)
            for (var i = 0; i < charsets.length; i++) {
                charsets[i] = arguments[i]
            }
        }

        // no charsets, return all requested charsets
        if (!charsets || charsets.length === 0) {
            return this.negotiator.charsets()
        }

        return this.negotiator.charsets(charsets)[0] || false
    }
    languages(languages_) {
        var languages = languages_

        // support flattened arguments
        if (languages && !Array.isArray(languages)) {
            languages = new Array(arguments.length)
            for (var i = 0; i < languages.length; i++) {
                languages[i] = arguments[i]
            }
        }

        // no languages, return all requested languages
        if (!languages || languages.length === 0) {
            return this.negotiator.languages()
        }

        return this.negotiator.languages(languages)[0] || false
    }
};