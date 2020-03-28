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

interface CropError {
  err: Error;
  occurenceIndex: number;
  image: DocxImage;
  outputPath: string;
}

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
  extractedImages: string[] = [];
  croppedImages: Dictionary<(CropResult | { srcPath: string })[]> = {};

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

  async _saveOccurencesOfImageInBook(
    occurencesOfImageInBook: DocxImage[],
    outputPath: string,
    croppedImages: (CropResult | { srcPath: string })[],
  ): Promise<(CropResult | CropError)[]> {
    const promises = occurencesOfImageInBook.map(async (image, i) => {
      try {
        // write to a modified outputPath
        const { dir, ext, name } = path.parse(outputPath);
        const newName = `${name}.crop.${i + 1}${ext}`;
        const newOutputPath = path.resolve(dir, newName);
        const result = await maybeCropImage(image, outputPath, newOutputPath);
        console.log("result", result);
        if (result) {
          // cropped
          croppedImages.push(result);
        } else {
          // not cropped
          croppedImages.push({
            srcPath: outputPath,
          });
        }
        return result;
      } catch (err) {
        return {
          err,
          occurenceIndex: i,
          image,
          outputPath,
        };
      }
    });
    return Promise.all(promises);
  }

  async handleImage(entry: yauzl.Entry, readStream: NodeJS.ReadableStream): Promise<(CropResult | CropError)[]> {
    const outputPath = this.outputFilePath(entry);
    console.log("writeToFile", outputPath);
    await writeToFile(readStream, outputPath);
    this.extractedImages.push(outputPath);

    const id = this.getImageIdFromEntry(entry);
    if (!id) {
      return;
    }

    const croppedImages = this.croppedImages[id] || [];
    this.croppedImages[id] = croppedImages;

    // find where this image appears in the book
    const occurencesOfImageInBook = this.images.filter((image) => image.embed === id);
    if (occurencesOfImageInBook.length === 0) {
      return;
    }

    const allResults = await this._saveOccurencesOfImageInBook(occurencesOfImageInBook, outputPath, croppedImages);

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

    return allResults;
  }

  shouldHandleEntry(entry: yauzl.Entry): boolean {
    return isDocumentXmlRels(entry) || isDocumentXml(entry) || isMedia(entry);
  }

  async entryHandler(entry: yauzl.Entry, readStream: NodeJS.ReadableStream): Promise<void> {
    // make sure to return/await the promises

    if (isDocumentXmlRels(entry)) {
      await this.handleDocumentRels(entry, readStream);
      return;
    }

    if (isDocumentXml(entry)) {
      await this.handleDocumentXml(entry, readStream);
      return;
    }

    if (isImage(entry, this.imageRels)) {
      await this.handleImage(entry, readStream);
      return;
    }

    return ignore(readStream);
  }

  /**
   * Returns the output path to save an image Entry to.
   * @param {yauzl.Entry} entry
   * @returns {string}
   * @memberof EntryHandler
   */
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
