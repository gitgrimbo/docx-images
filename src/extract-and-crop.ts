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
}

export interface EntryImageInfo {
  entryFileName: string;
  outputPath: string;
}

export interface ImageInfo {
  image: DocxImage;
  rel: Relationship;
  entryImage?: EntryImageInfo;
  crop?: CropResult;
  cropError?: CropError;
  outputPath: string;
}

export interface Extracts {
  entryImageInfos: EntryImageInfo[];
  imageInfos: ImageInfo[];
  imageRels: Dictionary<Relationship>;
}

function isImage(entry: yauzl.Entry, imageRels: Dictionary<Relationship>): boolean {
  const rel = findRelForEntry(entry, imageRels);
  if (!rel) {
    return false;
  }
  return isImageRel(rel);
}

class EntryHandler {
  private outputDir = "";

  private imagePrefix = "";

  /** The <Relationship> tags in the docx */
  private imageRels: Dictionary<Relationship> = null;

  /**
   * The images in the docx, in order of appearance in the docx.
   */
  private images: DocxImage[] = null;

  /**
   * The images in the docx, in order of appearance in the docx.
   */
  private imageInfos: ImageInfo[] = null;

  /**
   * The image files that were in the docx archive.
   * These images may have not been referenced in the document, but they were extracted anyway.
   */
  private entryImageInfos: EntryImageInfo[] = null;

  constructor(outputDir: string, imagePrefix = "") {
    this.outputDir = outputDir;
    this.imagePrefix = imagePrefix || "";
  }

  async maybeCropImage(image, srcPath, outputPath): Promise<CropResult | null> {
    return maybeCropImage(image, srcPath, outputPath);
  }

  async handleDocumentRels(entry: yauzl.Entry, readStream: NodeJS.ReadableStream): Promise<void> {
    const xml = await parseStream(readStream);
    this.imageRels = getImagesFromDocumentRels(xml);
  }

  async handleDocumentXml(entry: yauzl.Entry, readStream: NodeJS.ReadableStream): Promise<void> {
    const xml = await parseStream(readStream);
    this.images = getImagesFromDocument(xml);
  }

  async handleImage(entry: yauzl.Entry, readStream: NodeJS.ReadableStream): Promise<void> {
    const outputPath = this._outputFilePath(entry);
    await writeToFile(readStream, outputPath);
    if (!this.entryImageInfos) {
      this.entryImageInfos = [];
    }
    this.entryImageInfos.push({
      entryFileName: entry.fileName,
      outputPath,
    });
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

  async _generateImageInfo(): Promise<ImageInfo[]> {
    const imageRefCounts = {};

    this.imageInfos = [];

    const handle = async (image, imageIdx): Promise<ImageInfo> => {
      const rel = this.imageRels[image.embed];
      const { target } = rel;
      const entryImage = this.entryImageInfos.find((entryImage) => entryImage.entryFileName === "word/" + target);

      const outputPath = this._outputFilePath(target);

      let result = null;

      try {
        // write to a modified outputPath
        const srcPath = outputPath;

        // how many times have we seen this image?
        const refCount = imageRefCounts[srcPath] || 0;

        const { dir, ext, name } = path.parse(srcPath);
        const newName = `${name}.${refCount + 1}${ext}`;
        const newOutputPath = path.resolve(dir, newName);

        result = await maybeCropImage(image, srcPath, newOutputPath);

        if (result) {
          // we saved a cropped image, so update the ref count for its source path.
          imageRefCounts[srcPath] = (imageRefCounts[srcPath] || 0) + 1;
        }
      } catch (err) {
        console.log("error", err);
        return {
          image,
          rel,
          entryImage,
          outputPath,
          cropError: {
            err,
            imageIdx,
          },
        };
      }

      if (!result) {
        console.log(image.embed, target, outputPath, "image was not cropped");
        return {
          image,
          rel,
          entryImage,
          outputPath,
        };
      }

      // assume cropped
      console.log(image.embed, target, `image was cropped to:`);
      console.log(`  ${result.outputPath}, old-size: ${JSON.stringify(result.old)}, new-size: ${JSON.stringify(result.new)}`);
      return {
        image,
        rel,
        entryImage,
        crop: result,
        outputPath,
      };
    }

    for (const [imageIdx, image] of this.images.entries()) {
      // wait for the handling of images sequentially,
      // so there is no race condition on imageRefCounts
      const result = await handle(image, imageIdx);
      this.imageInfos.push(result);
    }

    return this.imageInfos;
  }

  async onFinish(): Promise<void> {
    await this._generateImageInfo();
  }

  getExtracts(): Extracts {
    return {
      entryImageInfos: this.entryImageInfos,
      imageInfos: this.imageInfos,
      imageRels: this.imageRels,
    };
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
