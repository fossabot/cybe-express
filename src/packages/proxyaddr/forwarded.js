module.exports = (req)=>{
    if (!req) {
        throw new TypeError('argument req is required')
      }
    
      var proxyAddrs = ((header)=> {
        var end = header.length
        var list = []
        var start = header.length
      
        // gather addresses, backwards
        for (var i = header.length - 1; i >= 0; i--) {
          switch (header.charCodeAt(i)) {
            case 0x20: /*   */
              if (start === end) {
                start = end = i
              }
              break
            case 0x2c: /* , */
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
      
        // final address
        if (start !== end) {
          list.push(header.substring(start, end))
        }
      
        return list
      })(req.headers['x-forwarded-for'] || '');
      var socketAddr = req.socket  ? req.socket.remoteAddress : req.connection.remoteAddress
      var addrs = [socketAddr].concat(proxyAddrs)
    
      // return all addresses
      return addrs
}