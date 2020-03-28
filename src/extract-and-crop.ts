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
  ShouldHandleEntry,
  Handler,
} from "./docx/reader";
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
  imageIdx: number;
  image: DocxImage;
  outputPath: string;
}

export interface ImageInfo {
  image: DocxImage;
  outputPath: string;
  crop?: CropResult;
  cropError?: CropError;
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

  /** The <Relationship> tags in the docx */
  imageRels: Dictionary<Relationship> = null;

  /**
   * The images in the docx, in order of appearance in the docx.
   */
  images: DocxImage[] = null;

  /**
   * The images in the docx, in order of appearance in the docx.
   */
  imageInfos: ImageInfo[] = null;

  /**
   * Map of image target (e.g. "media/image1.jpeg") to Relationship id (e.g. "rId8").
   */
  imageTargetToId: Dictionary<string> = null;

  constructor(outputDir: string, imagePrefix = "") {
    this.outputDir = outputDir;
    this.imagePrefix = imagePrefix || "";
  }

  getImageIdFromEntry(entry: yauzl.Entry): string {
    // Turn "word/media/image269.jpeg" into "media/image269.jpeg"
    // because the "Target" attribute of a <Relationship> does not have "word/" as a prefix.
    const filenameAsTarget = entry.fileName.replace(/^word\//, "");
    return this.imageTargetToId[filenameAsTarget];
  }

  async maybeCropImage(image, srcPath, outputPath): Promise<CropResult | null> {
    return maybeCropImage(image, srcPath, outputPath);
  }

  async handleDocumentRels(entry: yauzl.Entry, readStream: NodeJS.ReadableStream): Promise<void> {
    const xml = await parseStream(readStream);
    this.imageRels = getImagesFromDocumentRels(xml);

    // setup the map of <Relationship> targets to <Relationship> ids.
    this.imageTargetToId = Object.keys(this.imageRels)
      .reduce((map, id) => {
        const { target } = this.imageRels[id];
        map[target] = id;
        return map;
      }, {});
  }

  async handleDocumentXml(entry: yauzl.Entry, readStream: NodeJS.ReadableStream): Promise<void> {
    const xml = await parseStream(readStream);
    this.images = getImagesFromDocument(xml);
  }

  async handleImage(entry: yauzl.Entry, readStream: NodeJS.ReadableStream): Promise<void> {
    const outputPath = this._outputFilePath(entry);
    console.log("handleImage", outputPath);
    await writeToFile(readStream, outputPath);
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
   * Returns the output path to save an Entry or target to.
   * @param {yauzl.Entry | string} Entry or <Relationship target> string.
   * @returns {string}
   * @memberof EntryHandler
   */
  _outputFilePath(input: yauzl.Entry | string): string {
    const isTargetString = typeof input === "string";

    // entry.fileName is the 'virtual' pathname within the zip
    let filename = isTargetString ? input as string : (input as yauzl.Entry).fileName;

    const { base, dir } = path.parse(filename);

    // e.g. filename = "myprefix" + "image.jpeg"
    filename = this.imagePrefix + base;

    const parts = [
      this.outputDir,
      // the Entry.filename will start with "/word", so add it if we need to.
      isTargetString ? "word" : "",
      dir,
      filename,
    ];
    return path.resolve(...parts);
  }

  async _saveImage(
    image: DocxImage,
    imageIdx: number,
    outputPath: string,
  ): Promise<CropResult | CropError> {
    try {
      // write to a modified outputPath
      const { dir, ext, name } = path.parse(outputPath);
      const newName = `${name}.${imageIdx + 1}${ext}`;
      const newOutputPath = path.resolve(dir, newName);
      const result = await maybeCropImage(image, outputPath, newOutputPath);
      return result;
    } catch (err) {
      return {
        err,
        imageIdx,
        image,
        outputPath,
      };
    }
  }

  async _generateImageInfo(): Promise<ImageInfo[]> {
    this.imageInfos = await Promise.all(
      this.images.map(async (image, imageIdx) => {
        const { target } = this.imageRels[image.embed];
        const outputPath = this._outputFilePath(target);
        const result = await this._saveImage(image, imageIdx, outputPath);

        if (!result) {
          console.log(image.embed, target, outputPath, "image was not cropped");
          return {
            image,
            outputPath,
          };
        }

        if ("err" in result) {
          console.log("error", result);
          return {
            image,
            outputPath,
            cropError: result,
          };
        }

        // assume cropped
        console.log(image.embed, target, `image was cropped to:`);
        console.log(`  ${result.outputPath}, old-size: ${JSON.stringify(result.old)}, new-size: ${JSON.stringify(result.new)}`);
        return {
          image,
          outputPath,
          crop: result,
        };
      })
    );

    return this.imageInfos;
  }

  async onFinish(): Promise<void> {
    await this._generateImageInfo();
  }
}

function getReadDOCXOpts(entryHandler: EntryHandler): {
  shouldHandleEntry: ShouldHandleEntry;
  entryHandler: Handler;
  onFinish: () => Promise<void>;
} {
  return {
    shouldHandleEntry: entryHandler.shouldHandleEntry.bind(entryHandler),
    entryHandler: entryHandler.entryHandler.bind(entryHandler),
    onFinish: entryHandler.onFinish.bind(entryHandler),
  };
}

export {
  EntryHandler,
  getReadDOCXOpts,
  isImage,
};
