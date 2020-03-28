import * as minimist from "minimist";
import Dictionary from "../Dictionary";
import CommandArgDescriptor from "./CommandArgDescriptor";

function minimistOpts(argInfo: Dictionary<CommandArgDescriptor>): minimist.Opts {
  const opts = {
    string: [] as string[],
    default: {},
  };
  Object.keys(argInfo)
    .forEach((key) => {
      const info = argInfo[key];
      if (info.type === "string") {
        const arr = opts.string = opts.string || [];
        arr.push(key);
      }
      if (info.defaultValue) {
        opts.default = opts.default || {};
        opts.default[key] = info.defaultValue;
      }
    });
  return opts;
}

function printHelp(binName: string, commandName: string, argInfo: Dictionary<CommandArgDescriptor>): void {
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

export {
  minimistOpts,
  printHelp,
};
