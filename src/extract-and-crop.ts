import * as path from "path";
import * as yauzl from "yauzl";

import Dictionary from "./Dictionary";
import {
  getImages as getImagesFromDocument,
  DocxImage,
} from "./docx/document.xml";
import {
  getImages as getImagesFromDocumentRels,
  findRelForEntry,
  isImageRel,
  Relationship,
} from "./docx/document.xml.rels";
import {
  isDocumentXml,
  isDocumentXmlRels,
  isMedia,
} from "./docx/entry-tests";
import {
  maybeCropImage,
  CropResult,
} from "./image";
import { parseStream } from "./xml-parse";
import {
  ignore,
  writeToFile,
} from "./streams";

function isImage(entry: yauzl.Entry, imageRels: Dictionary<Relationship>): boolean {
  const rel = findRelForEntry(entry, imageRels);
  if (!rel) {
    return false;
  }
  return isImageRel(rel);
}

class EntryHandler {
  outputDir = "";
  imagePrefix = "";
  imageRels: Dictionary<Relationship> = null;
  images: DocxImage[] = null;
  imageTargetToId: Dictionary<string> = null;
  extractedImages = {};

  constructor(outputDir: string, imagePrefix = "") {
    this.outputDir = outputDir;
    this.imagePrefix = imagePrefix || "";
  }

  getImageIdFromEntry(entry: yauzl.Entry): string {
    // turn "word/media/image269.jpeg" into "media/image269.jpeg"
    const filenameAsTarget = entry.fileName.replace(/^word\//, "");
    return this.imageTargetToId[filenameAsTarget];
  }

  async maybeCropImage(image, srcPath, outputPath): Promise<CropResult | null> {
    return maybeCropImage(image, srcPath, outputPath);
  }

  async handleDocumentRels(entry: yauzl.Entry, readStream: NodeJS.ReadableStream): Promise<void> {
    const xml = await parseStream(readStream);
    this.imageRels = getImagesFromDocumentRels(xml);

    this.imageTargetToId = Object.keys(this.imageRels)
      .reduce((map, id) => {
        const { target } = this.imageRels[id];
        // eslint-disable-next-line no-param-reassign
        map[target] = id;
        return map;
      }, {});
  }

  async handleDocumentXml(entry: yauzl.Entry, readStream: NodeJS.ReadableStream): Promise<void> {
    const xml = await parseStream(readStream);
    this.images = getImagesFromDocument(xml);
  }

  async handleImage(entry: yauzl.Entry, readStream: NodeJS.ReadableStream): Promise<void> {
    const outputPath = this.outputFilePath(entry);
    await writeToFile(readStream, outputPath);

    const id = this.getImageIdFromEntry(entry);
    if (!id) {
      return;
    }

    const extractedImages = this.extractedImages[id] || [];
    this.extractedImages[id] = extractedImages;

    // find where this image appears in the book
    const occurencesOfImageInBook = this.images.filter((image) => image.embed === id);
    if (occurencesOfImageInBook.length === 0) {
      return;
    }

    const allResults = await Promise.all(
      occurencesOfImageInBook.map(async (image, i) => {
        try {
          // write to a modified outputPath
          const { dir, ext, name } = path.parse(outputPath);
          const newName = `${name}.crop.${i + 1}${ext}`;
          const newOutputPath = path.resolve(dir, newName);
          const result = await maybeCropImage(image, outputPath, newOutputPath);
          if (result) {
            // cropped
            extractedImages.push(result);
          } else {
            // not cropped
            extractedImages.push({
              srcPath: outputPath,
            });
          }
          return result;
        } catch (err) {
          return {
            entry,
            err,
            i,
            id,
            image,
            outputPath,
          };
        }
      })
    );

    allResults.forEach((result) => {
      if (!result) {
        console.log(id, entry.fileName, outputPath, "image was not cropped");
        return;
      }

      if ("err" in result) {
        console.log("error", result);
        return;
      }

      // assume cropped
      console.log(id, entry.fileName, `image was cropped to:`);
      console.log(`  ${result.outputPath}, old-size: ${JSON.stringify(result.old)}, new-size: ${JSON.stringify(result.new)}`);
    });
  }

  shouldHandleEntry(entry: yauzl.Entry): boolean {
    return isDocumentXmlRels(entry) || isDocumentXml(entry) || isMedia(entry);
  }

  async entryHandler(entry: yauzl.Entry, readStream: NodeJS.ReadableStream): Promise<void> {
    // make sure to return/await the promises

    if (isDocumentXmlRels(entry)) {
      return this.handleDocumentRels(entry, readStream);
    }

    if (isDocumentXml(entry)) {
      return this.handleDocumentXml(entry, readStream);
    }

    if (isImage(entry, this.imageRels)) {
      return this.handleImage(entry, readStream);
    }

    return ignore(readStream);
  }

  outputFilePath(entry: yauzl.Entry): string {
    // entry.fileName is the 'virtual' pathname within the zip
    const { base, dir } = path.parse(entry.fileName);

    // e.g. filename = "myprefix" + "image.jpeg"
    const filename = this.imagePrefix + base;

    return path.resolve(this.outputDir, dir, filename);
  }
}

function getReadDOCXOpts(entryHandler: EntryHandler): {
  shouldHandleEntry: (entry: yauzl.Entry) => boolean;
  entryHandler: (entry: yauzl.Entry, readStream: NodeJS.ReadableStream) => boolean;
} {
  return {
    shouldHandleEntry: entryHandler.shouldHandleEntry.bind(entryHandler),
    entryHandler: entryHandler.entryHandler.bind(entryHandler),
  };
}

export {
  EntryHandler,
  getReadDOCXOpts,
  isImage,
};
