/*
Script that will do any necessary cropping to the images that are extracted from a docx file.
*/
import * as minimist from "minimist";

import { minimistOpts, printHelp } from "../util";
import { readDOCXFile } from "../../docx/reader";
import { EntryHandler, getReadDOCXOpts } from "../../extract-and-crop";
import { printHtmlReport } from "../../reports";
import Dictionary from "../../Dictionary";
import { Relationship } from "../../docx/document.xml.rels";
import { DocxImage } from "../../docx/document.xml";
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

function printImages(images: DocxImage[], imageRels: Dictionary<Relationship> = {}): void {
  console.log();
  console.log(`${images.length} images (the order the images appear in the document):`);
  images.forEach((image) => {
    const target = imageRels[image.embed];
    console.log(image.embed, target);
  });
}

function printResults(entryHandler): void {
  const { images, imageRels } = entryHandler;

  if (images && imageRels) {
    printImageRels(imageRels);
    printImages(images, imageRels);
  }

  const extractedImages = Object.keys(entryHandler.croppedImages)
    .reduce((prev, key) => {
      // copy the array
      // eslint-disable-next-line no-param-reassign
      prev[key] = [...entryHandler.croppedImages[key]];
      return prev;
    }, {});

  entryHandler.images.forEach((image) => {
    const extractedImage = extractedImages[image.embed].shift();

    if (!extractedImage) {
      console.log(image.embed, "Image was not extracted");
      return;
    }

    if (extractedImage.outputPath) {
      // a cropped image has outputPath
      console.log(image.embed, extractedImage.outputPath);
    } else {
      // a non-cropped image has srcPath only
      console.log(image.embed, extractedImage.srcPath);
    }
  });
}

async function main(binName, commandName, args): Promise<void> {
  const commandArgInfo: Dictionary<CommandArgDescriptor> = {
    docx: {
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
  };

  const argv = minimist(args, minimistOpts(commandArgInfo));

  const input = argv._[0];

  if (input === "help") {
    printHelp(binName, commandName, commandArgInfo);
    return;
  }

  const { docx, "output-dir": outputDir, "image-prefix": imagePrefix } = argv;
  if (!docx) {
    console.error(`Invalid arguments to "${commandName}"`);
    printHelp(binName, commandName, commandArgInfo);
    return;
  }

  if (!docx) {
    console.error(`Invalid arguments to "${commandName}"`);
    printHelp(binName, commandName, commandArgInfo);
    return;
  }

  const entryHandler = new EntryHandler(outputDir, imagePrefix);

  const opts = getReadDOCXOpts(entryHandler);

  await readDOCXFile(docx, opts);

  printResults(entryHandler);

  const { images, imageRels } = entryHandler;
  if (images && imageRels) {
    await printHtmlReport("images.html", outputDir, entryHandler.extractedImages, entryHandler.croppedImages);
  }
}

export default main;
