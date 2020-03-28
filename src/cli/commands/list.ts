/*
This script tries to present information on the images stored within a docx file.

See "./docx.js" for more detail on the docx format.

There are 3 possible inputs to pass to this script:

- A "./word/_rels/document.xml.rels" file (need to extract from a docx file first). The script
  will list the relationships.
- A "./word/document.xml" file (need to extract from a docx file first). The script will list all
  <a:blip> tags with an "embed" id.
- A docx file. In this case the script will performance an in-memory extract of both the
  document.xml.rels and document.xml files and list the images.
*/
import * as minimist from "minimist";

import { minimistOpts, printHelp } from "../util";
import { listImages } from "../../list-images";
import {
  getImagesFromFile as getImagesFromDocumentFile,
  DocxImage,
} from "../../docx/document.xml";
import {
  getImagesFromFile as getImagesFromDocumentRelsFile,
  Relationship,
} from "../../docx/document.xml.rels";
import Dictionary from "../../Dictionary";
import CommandArgDescriptor from "../CommandArgDescriptor";

async function handleResults(images: DocxImage[], imageRels: Dictionary<Relationship>): Promise<void> {
  if (imageRels) {
    const keys = Object.keys(imageRels);
    console.log();
    console.log(`${keys.length} imageRels (image lookups - map an id to a target):`);
    keys.forEach((id) => {
      const { target } = imageRels[id];
      console.log(id, target);
    });
  }

  if (images) {
    console.log();
    console.log(`${images.length} images (the order the images appear in the document):`);
    const occurences = {};
    images.forEach((image) => {
      // count occurences
      occurences[image.embed] = (occurences[image.embed] || 0) + 1;

      let target = "unknown target (no imageRels loaded)";
      if (imageRels && imageRels[image.embed]) {
        ({ target } = imageRels[image.embed]);
      }

      const args = [
        "embed=",
        image.embed,
        "count=",
        occurences[image.embed],
        "target=",
        target,
      ];
      if (image.srcRect) {
        args.push("srcRect=");
        args.push(image.srcRect);
      }
      if (image.extent) {
        args.push("extent=");
        args.push(image.extent);
      }
      console.log(...args);
    });
  }
}

async function getResults(docx, documentXml, documentXmlRels): Promise<{
  images: DocxImage[];
  imageRels: Dictionary<Relationship>;
}> {
  let images;
  let imageRels;

  if (documentXmlRels) {
    console.log(`Loading document.xml.rels from ${documentXmlRels}`);
    imageRels = await getImagesFromDocumentRelsFile(documentXmlRels);
  } else if (documentXml) {
    console.log(`Loading document.xml from ${documentXml}`);
    images = await getImagesFromDocumentFile(documentXml);
  } else {
    console.log(`Loading docx from ${docx}`);
    ({ images, imageRels } = await listImages(docx));
  }

  return {
    images,
    imageRels,
  };
}

async function main(binName, commandName, args): Promise<void> {
  const commandArgInfo: Dictionary<CommandArgDescriptor> = {
    docx: {
      description: "The path to the docx file.",
      type: "string",
    },
    documentXml: {
      description: "The path to an already-extracted document.xml.rels file.",
      type: "string",
    },
    documentXmlRels: {
      description: "The path to an already-extracted document.xml file.",
      type: "string",
    },
  };

  const argv = minimist(args, minimistOpts(commandArgInfo));

  const input = argv._[0];

  if (input === "help") {
    printHelp(binName, commandName, commandArgInfo);
    return;
  }

  const { docx, documentXml, documentXmlRels } = argv;
  if (!docx && !documentXml && !documentXmlRels) {
    console.error(`Invalid arguments to "${commandName}"`);
    printHelp(binName, commandName, commandArgInfo);
    return;
  }

  const { images, imageRels } = await getResults(docx, documentXml, documentXmlRels);
  await handleResults(images, imageRels);
}

export default main;
