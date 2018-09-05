/*
CLI orchestration script.
*/
const packageJSON = require("../../package.json");
const extractCommand = require("./commands/extract");
const listCommand = require("./commands/list");

const binName = packageJSON.name;

const commands = {
  extract: extractCommand,
  list: listCommand,
};

function quoteArr(arr, quote = `"`) {
  const joined = arr.join(`${quote}, ${quote}`);
  return `${quote}${joined}${quote}`;
}

function printHelp() {
  const commandNames = quoteArr(Object.keys(commands));
  const lines = [
    `Usage is ${binName} command ...args`,
    `  Where command is one of [${commandNames}]`,
    `  And ...args is zero or more arguments for that command`,
  ];
  lines.forEach((line) => console.log(line));
}

async function main() {
  const args = process.argv.slice(2);

  // remove the argument and treat as command name
  const commandName = args.shift();

  if (!commandName || commandName === "help") {
    printHelp();
    return;
  }

  const command = commands[commandName];
  if (!command) {
    console.error(`command "${commandName}" is unknown`);
    printHelp();
    return;
  }

  // command returns a Promise
  await command(binName, commandName, args);
}

main()
  .then(() => console.log("Done"))
  .catch((err) => {
    if (err.code === "ENOENT") {
      console.error(`File not found ${err.path}`);
      return;
    }
    console.error(err);
  });
