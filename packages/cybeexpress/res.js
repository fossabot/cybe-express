var {
    ServerResponse
} = require('http');

var res = Object.create(ServerResponse.prototype)

res.status = (code) => {
    this.statusCode = code;
    return this;
};

res.links = (links) => {
    var link = this.get('Link') || '';
    if (link) link += ', ';
    return this.set('Link', link + Object.keys(links).map((rel) => {
        return '<' + links[rel] + '>; rel="' + rel + '"';
    }).join(', '));
};

module.exports = res