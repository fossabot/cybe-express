const fs = require('fs');
const getRepoInfo = require('git-repo-info');
const moment = require('moment');

let gitMode;
let dateFormat;
let buildOptions;
let cache;

class Info {
  constructor(options = {}, contextCache) {
    gitMode = options.gitMode
    dateFormat = options.dateFormat
    buildOptions = options.buildOptions
    cache = contextCache
  }

  route(req, res) {
    const build = getBuild(buildOptions);
    const git = getRepoInfo();


    res.status(200).json({
      build: build,
      git: git
    })
  }
}

module.exports = Info

function getBuild(options) {
  const packageJson = getPackageJsonFile()

  let build
  if (packageJson !== undefined) {
    build = Object.assign({
      name: packageJson.name,
      description: packageJson.description,
      version: packageJson.version
    }, options === Object(options) ? options : {})
  }

  return build
}

function getPackageJsonFile() {
  var packageJson = cache.get('packageJson')
  if (packageJson === undefined) {
    try {
      const packageFile = fs.readFileSync(`${process.cwd()}/package.json`, 'utf8')

      packageJson = JSON.parse(packageFile)
      cache.set('packageJson', packageJson)
    } catch (err) {
      // Error getting and parsing package.json
    }
  }
  return packageJson
}