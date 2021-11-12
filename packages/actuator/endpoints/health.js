class Health {
    constructor(req, res) {
        this.route(req, res);
    }
    route(req, res) {
        res.status(200).json({
            status: 'UP'
        })
    }
}

module.exports = Health