module.exports = {
    'default': 'RFC3986',
    formatters: {
        RFC1738: function (value) {
            return String.prototype.replace.call(value, /%20/g, '+');
        },
        RFC3986: function (value) {
            return String(value);
        }
    },
    RFC1738: 'RFC1738',
    RFC3986: 'RFC3986'
};