const {
    readFileSync,
    statSync
} = require('node:fs');
const {
    propertyAppender
} = (() => {
    var defaultOptions = {
        allowDuplicateSections: false,
    };

    function simplePropertyAppender(properties, key, value) {
        properties[key] = value;

        return properties;
    }

    function sectionCollapsePropertyAppender(properties, key, value) {
        var output = {};
        var section = sectionFromPropertyName(key);
        var existingKeys = Object.keys(properties);

        // no section in property name so just append it to the list
        if (!section || !existingKeys.length) {
            output[key] = value;
            return Object.assign(properties, output);
        }

        // has a section in the property name so append it in that section
        var BEFORE = 1,
            DURING = 2,
            AFTER = 4;
        var processing = BEFORE;

        existingKeys.forEach(function(processingKey) {

            var during = processing !== AFTER && processingKey.indexOf(section + '.') === 0;

            if (key === processingKey) {
                properties[processingKey] = value;
                processing = AFTER;
            } else if (processing === BEFORE && during) {
                // starts to be DURING
                processing = DURING;
            } else if (processing === DURING && !during) {
                // is now after
                output[key] = value;
                processing = AFTER;
            }

            output[processingKey] = properties[processingKey];

        });

        if (processing !== AFTER) {
            output[key] = value;
        }

        return output;

    }

    function sectionFromPropertyName(name) {
        var index = String(name).indexOf('.');
        return index > 0 && name.substr(0, index) || '';
    }

    /**
     * Builder method used to create a property appending function configured to the user
     * requirements.
     */
    function propertyAppender(userOptions) {
        var options = Object.assign({}, defaultOptions, userOptions || {});

        if (options.allowDuplicateSections) {
            return simplePropertyAppender;
        }

        return sectionCollapsePropertyAppender;
    }

    return {
        defaultOptions: defaultOptions,
        propertyAppender: propertyAppender,
    };
})();
const propertyWriter = (() => {
    const fs = require('fs');

    const defaultOptions = {
        saveSections: true,
    };

    function flat(props) {
        const out = [];
        props.each((key, value) => out.push(`${key}=${value}`));
        return out;
    }

    function section(props) {
        var lines = [];
        var section = null;
        props.each(function(key, value) {
            var tokens = key.split('.');
            if (tokens.length > 1) {
                if (section !== tokens[0]) {
                    section = tokens[0];
                    lines.push('[' + section + ']');
                }
                key = tokens.slice(1).join('.');
            } else {
                section = null;
            }

            lines.push(key + '=' + value);
        });
        return lines;
    }

    return function propertyWriter(userOptions) {
        const options = Object.assign({}, defaultOptions, userOptions || {});

        return (props, destFile, onComplete) => {
            const onDone = new Promise((done, fail) => {
                const content = (options.saveSections ? section(props) : flat(props)).join('\n');
                fs.writeFile(destFile, content, (err) => {
                    if (err) {
                        return fail(err);
                    }

                    done(content);
                });
            });

            if (typeof onComplete === 'function') {
                if (onComplete.length > 1) {
                    onDone.then(() => onComplete(null), (e) => onComplete(e));
                } else {
                    onDone.then(onComplete)
                }
            }

            return onDone;
        }
    };
})();

class PropertiesReader {
    constructor(sourceFile, encoding, options = {}) {
        this._encoding = typeof encoding === 'string' && encoding || 'utf-8';
        this._properties = {};
        this._propertiesExpanded = {};

        this.appender(options.appender || options);
        this.writer(options.writer || options);
        this.append(sourceFile, encoding);
        this.prototype[Symbol('SECTION')] = '';
        Object.defineProperty(this.prototype, 'length', {
            configurable: false,
            enumerable: false,
            get() {
                return Object.keys(this._properties).length;
            }
        });
    }
    appender(appender) {
        if (typeof appender === 'function') {
            this._propertyAppender = appender;
        } else if (typeof appender === 'object') {
            this._propertyAppender = propertyAppender(appender);
        }

        return this;
    };
    writer(writer) {
        if (typeof writer === 'function') {
            this._propertyWriter = writer;
        } else if (typeof writer === 'object') {
            this._propertyWriter = propertyWriter(writer);
        }

        return this;
    };
    append(sourceFile, encoding) {
        if (sourceFile) {
            this.read(readFileSync(sourceFile, typeof encoding === 'string' && encoding || this._encoding));
        }

        return this;
    };
    read(input) {
        delete this[SECTION];
        ('' + input).split('\n').forEach(this._readLine, this);
        return this;
    };
    _readLine(propertyString) {
        if (!!(propertyString = propertyString.trim())) {
            var section = /^\[([^=]+)]$/.exec(propertyString);
            var property = !section && /^([^#=]+)(={0,1})(.*)$/.exec(propertyString);

            if (section) {
                this[SECTION] = section[1];
            } else if (property) {
                section = this[SECTION] ? this[SECTION] + '.' : '';
                this.set(section + property[1].trim(), property[3].trim());
            }
        }
    };
    each(fn, scope) {
        for (var key in this._properties) {
            if (this._properties.hasOwnProperty(key)) {
                fn.call(scope || this, key, this._properties[key]);
            }
        }
        return this;
    };
    _parsed(value) {

        if (value !== null && value !== '' && !isNaN(value)) {
            return +value;
        }

        if (value === 'true' || value === 'false') {
            return value === 'true';
        }

        if (typeof value === "string") {
            var replacements = {
                '\\n': '\n',
                '\\r': '\r',
                '\\t': '\t'
            };
            return value.replace(/\\[nrt]/g, function(key) {
                return replacements[key];
            });
        }

        return value;
    };
    get(key) {
        return this._parsed(this.getRaw(key));
    };
    getRaw(key) {
        return this._properties.hasOwnProperty(key) ? this._properties[key] : null;
    };
    set(key, value) {
        var parsedValue = ('' + value).trim();

        this._properties = this._propertyAppender(this._properties, key, parsedValue);

        var expanded = key.split('.');
        var source = this._propertiesExpanded;

        while (expanded.length > 1) {
            var step = expanded.shift();
            if (expanded.length >= 1 && typeof source[step] === 'string') {
                source[step] = {
                    '': source[step]
                };
            }

            if (!Object.prototype.hasOwnProperty.call.bind(Object.prototype.hasOwnProperty)(source, step)) {
                Object.defineProperty(source, step, {
                    value: {}
                });
            }

            source = source[step]
        }

        if (typeof parsedValue === 'string' && typeof source[expanded[0]] === 'object') {
            source[expanded[0]][''] = parsedValue;
        } else {
            source[expanded[0]] = parsedValue;
        }

        return this;
    };
    path() {
        return this._propertiesExpanded;
    };
    getAllProperties() {
        var properties = {};
        this.each(function(key, value) {
            properties[key] = value;
        });
        return properties;
    };
    clone() {
        var propertiesReader = new PropertiesReader(null);
        this.each(propertiesReader.set, propertiesReader);

        return propertiesReader;
    };
    getByRoot(root) {
        var keys = Object.keys(this._properties);
        var outObj = {};

        for (var i = 0, prefixLength = String(root).length; i < keys.length; i++) {
            var key = keys[i];

            if (key.indexOf(root) === 0 && key.charAt(prefixLength) === '.') {
                outObj[key.substr(prefixLength + 1)] = this.get(key);
            }
        }

        return outObj;
    };
    bindToExpress(app, basePath, makePaths) {
        var Path = require('path');

        if (!/\/$/.test(basePath = basePath || process.cwd())) {
            basePath += '/';
        }

        this.each(function(key, value) {
            if (value && /\.(path|dir)$/.test(key)) {
                value = Path.resolve(basePath, value);
                this.set(key, value);

                try {
                    var directoryPath = /dir$/.test(key) ? value : Path.dirname(value);
                    if (makePaths) {
                        require('mkdirp').sync(directoryPath);
                    } else if (!statSync(directoryPath).isDirectory()) {
                        throw new Error("Path is not a directory that already exists");
                    }
                } catch (e) {
                    throw new Error("Unable to create directory " + value);
                }
            }

            app.set(key, this.get(key));

            if (/^browser\./.test(key)) {
                app.locals[key.substr(8)] = this.get(key);
            }
        }, this);

        app.set('properties', this);

        return this;
    };
    save(destFile, onComplete) {
        return this._propertyWriter(this, destFile, onComplete);
    }
}


module.exports = function propertiesReaderFactory(sourceFile, encoding, options) {
    return new PropertiesReader(sourceFile, encoding, options);
};