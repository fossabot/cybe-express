var chalk = require('chalk')
var oldconsole = console;

console.debug = (...arguments) => {
    oldconsole.log(chalk.green('[Debug]'), ...arguments);
};

console.info = (...arguments) => {
    oldconsole.log(chalk.blue('ⓘ [Info]'), ...arguments);
}

console.warn = (...arguments) => {
    oldconsole.log(chalk.red('⚠ [Warning]'), ...arguments)
}

console.caution = (...arguments) => {
    oldconsole.log(chalk.yellow('⚠ [Caution]'), ...arguments)
}