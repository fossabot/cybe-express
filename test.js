global.debug = true;

const cybeexpress = require('./packages/cybeexpress');
const chalk = require('chalk');
const app = cybeexpress();

app.get.on('/', (req, res) => {
    res.end('test')
})

app.listen(443, () => {
    console.log(`${chalk.blue("[Info]")} listening on 443`);
});