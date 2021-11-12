global.debug = true;

const express = require('./packages/express');
const chalk = require('chalk');
const actuator = require('./packages/actuator')
const app = express.createapp();

function getPackageJsonFile() {
    const packageFile = fs.readFileSync('./package.json', 'utf8')
    return JSON.parse(packageFile)
}

app.use(actuator({
    basePath: '/api/help',
    infoGitMode: 'full',
    infoBuildOptions: null,
    infoDateFormat: null,
    customEndpoints: [{
        id: 'dependecies',
        controller: (req, res) => {
            var package = getPackageJsonFile()
            res.JSON({
                dependencies: package.dependencies,
                devDependencies: package.devDependencies
            })
        }
    }]
}))

app.get('/', (req, res) => {
    res.send('test')
})

app.listen(443, () => {
    console.log(`${chalk.blue("[Info]")} listening on 443`);
})