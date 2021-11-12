class Metrics {
    constructor(req, res) {
        console.log(res)
        this.route(req, res);
    }
    route(req, res) {
        res.status(200).json({
            mem: process.memoryUsage(),
            uptime: process.uptime()
        })
    }
}
module.exports = Metrics