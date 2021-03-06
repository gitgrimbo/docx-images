/*
Script that will do any necessary cropping to the images that are extracted from a docx file.
*/
import * as path from "path";
import * as minimist from "minimist";

import {
  minimistOpts,
  printHelp,
} from "../util";
import { readDOCXFile } from "../../docx/reader";
import {
  EntryHandler,
  getReadDOCXOpts,
} from "../../extract-and-crop";
import { printHtmlReport } from "../../reports";
import Dictionary from "../../Dictionary";
import { Relationship } from "../../docx/document.xml.rels";
import CommandArgDescriptor from "../CommandArgDescriptor";

function printImageRels(imageRels: Dictionary<Relationship>): void {
  const keys = Object.keys(imageRels);
  console.log();
  console.log(`${keys.length} imageRels (image lookups - map an id to a target):`);
  keys.forEach((id) => {
    const target = imageRels[id];
    console.log(id, target);
  });
}

async function printResults(entryHandler: EntryHandler): Promise<void> {
  const {
    imageRels,
    imageInfos,
  } = entryHandler.getExtracts();

  if (imageRels) {
    printImageRels(imageRels);
  }

  imageInfos.forEach((imageInfo, imageInfoIdx) => {
    console.log(imageInfoIdx, JSON.stringify(imageInfo, null, 1));
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireEntryHandlerOpts(optsModulePath: string): Promise<any> {
  let abs = optsModulePath;
  if (!path.isAbsolute(abs)) {
    abs = path.resolve(".", abs);
  }
  return require(abs);
}

async function main(binName, commandName, args): Promise<void> {
  const commandArgInfo: Dictionary<CommandArgDescriptor> = {
    "docx": {
      description: "The path to the docx file.",
      type: "string",
    },
    "output-dir": {
      description: "Output folder for the extracted file(s).",
      type: "string",
      defaultValue: ".",
    },
    "image-prefix": {
      description: "A prefix to use for the extracted image name(s).",
      type: "string",
      defaultValue: "",
    },
    "opts-module": {
      description: "A CommonJS module path providing custom options code.",
      type: "string",
    },
  };

  const argv = minimist(args, minimistOpts(commandArgInfo));

  const input = argv._[0];

  if (input === "help") {
    printHelp(binName, commandName, commandArgInfo);
    return;
  }

  const {
    docx,
    "output-dir": outputDir,
    "image-prefix": imagePrefix,
    "opts-module": optsModulePath,
  } = argv;

  if (!docx) {
    console.error(`Invalid arguments to "${commandName}"`);
    printHelp(binName, commandName, commandArgInfo);
    return;
  }

  if (!outputDir) {
    console.error(`Invalid arguments to "${commandName}"`);
    printHelp(binName, commandName, commandArgInfo);
    return;
  }

  let entryHandlerOpts = null;
  if (optsModulePath) {
    entryHandlerOpts = await requireEntryHandlerOpts(optsModulePath);
  }
  const entryHandler = new EntryHandler(outputDir, imagePrefix, entryHandlerOpts);

  const opts = getReadDOCXOpts(entryHandler);

  await readDOCXFile(docx, opts);

  await printResults(entryHandler);
  await printHtmlReport("docx-images.report.html", outputDir, entryHandler.getExtracts());
}

export default main;
