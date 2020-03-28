const packageJSON = require("../../../package.json");

async function main() {
  console.log(packageJSON.version);
}

module.exports = main;
