function minimistOpts(argInfo) {
  const opts = {};
  Object.keys(argInfo)
    .forEach((key) => {
      const info = argInfo[key];
      if (info.type === "string") {
        opts.string = opts.string || [];
        opts.string.push(key);
      }
      if (info.defaultValue) {
        opts.default = opts.default || {};
        opts.default[key] = info.defaultValue;
      }
    });
  return opts;
}

function printHelp(binName, commandName, argInfo) {
  console.log(`Usage is: ${binName} ${commandName} [options...]`);
  Object.keys(argInfo)
    .forEach((key) => {
      const { defaultValue, description, type } = argInfo[key];
      const maybeType = type
        ? ` {${type}}`
        : "";
      const maybeDefault = (typeof defaultValue !== "undefined")
        ? ` [Default "${defaultValue}"]`
        : "";
      let desc = description;
      if (!desc.endsWith(".")) {
        desc += ".";
      }
      console.log(`  --${key}:${maybeType} ${desc}${maybeDefault}`);
    });
}

module.exports = {
  minimistOpts,
  printHelp,
};
