import { promises as fsp } from "fs";
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
import { closest } from "./xml-query";

interface CropError {
  err: Error;
  imageIdx: number;
}

interface EntryImageInfo {
  entryFileName: string;
  outputPath: string;
}

interface ImageInfo {
  image: DocxImage;
  rel: Relationship;
  entryImage?: EntryImageInfo;
  crop?: CropResult;
  cropError?: CropError;
  outputPath: string;
}

interface Extracts {
  entryImageInfos: EntryImageInfo[];
  imageInfos: ImageInfo[];
  imageRels: Dictionary<Relationship>;
}

/**
 * Return null if you don't want to provide an image path, and want to take the default.
 */
type PathForEntryImageCallback = (opts: {
  outputDir: string;
  imagePrefix: string;
  entry: yauzl.Entry;
}) => string | null;

/**
 * Return null if you don't want to provide an image path, and want to take the default.
 */
type PathForImageInDocumentCallback = (opts: {
  outputDir: string;
  imagePrefix: string;
  image: DocxImage;
  imageRels: Dictionary<Relationship>;
  entryImage: EntryImageInfo;
  refCount: number;
}) => string | null;

/**
 * Returns the output path to save an Entry or target to.
 * @param {yauzl.Entry} entry.
 * @param {string} outputDir Root directory of the output path.
 * @param {string} imagePrefix Prefix to prepend to image file name.
 * @returns {string}
 */
function makeOutputFilePath(entry: yauzl.Entry, outputDir: string, imagePrefix = ""): string {
  // entry.fileName is the 'virtual' pathname within the zip
  let filename = entry.fileName;

  const { base, dir } = path.parse(filename);

  // e.g. filename = "myprefix" + "image.jpeg"
  filename = imagePrefix + base;

  const parts = [
    outputDir,
    dir,
    filename,
  ];
  return path.resolve(...parts);
}

const defaultPathForEntryImage: PathForEntryImageCallback = ({
  outputDir,
  imagePrefix,
  entry,
}) => {
  return makeOutputFilePath(entry, outputDir, imagePrefix);
};

const defaultMakeCroppedImagePath: PathForImageInDocumentCallback = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  outputDir,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  imagePrefix,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  image,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  imageRels,
  entryImage,
  refCount,
}) => {
  const { dir, ext, name } = path.parse(entryImage.outputPath);
  const newName = `${name}.${refCount + 1}${ext}`;
  return path.resolve(dir, newName);
};

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

  private pathForImageInDocument: PathForImageInDocumentCallback = null;
  private pathForEntryImage: PathForEntryImageCallback = null;
  private ignoreFallbackImages = true;

  constructor(outputDir: string, imagePrefix = "", opts: {
    pathForImageInDocument?: PathForImageInDocumentCallback;
    pathForEntryImage?: PathForEntryImageCallback;
    ignoreFallbackImages?: boolean;
  } = {}) {
    this.outputDir = outputDir;
    this.imagePrefix = imagePrefix || "";
    this.pathForImageInDocument = opts.pathForImageInDocument;
    this.pathForEntryImage = opts.pathForEntryImage;
    this.ignoreFallbackImages = opts.ignoreFallbackImages;
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
    const pathForEntryImageOpts = {
      outputDir: this.outputDir,
      imagePrefix: this.imagePrefix,
      entry,
    };

    let outputPath = null;

    // if a custom callback is provided, use it.
    if (this.pathForEntryImage) {
      outputPath = this.pathForEntryImage(pathForEntryImageOpts);
    }

    // if there's no output path (either there was no custom callback, or it returned null)
    // use the default callback
    if (!outputPath) {
      outputPath = defaultPathForEntryImage(pathForEntryImageOpts);
    }

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

  async _generateImageInfo(): Promise<ImageInfo[]> {
    const imageRefCounts = {};

    this.imageInfos = [];

    const handle = async (image: DocxImage, imageIdx: number): Promise<ImageInfo> => {
      if (this.ignoreFallbackImages) {
        // ignore any images in <mc:Fallback> tags
        const fallback = closest(image.blip, "Fallback");
        if (fallback) {
          return null;
        }
      }

      const rel = this.imageRels[image.embed];
      const { target } = rel;
      const entryImage = this.entryImageInfos.find((entryImage) => entryImage.entryFileName === "word/" + target);

      const entryOutputPath = entryImage.outputPath;

      let result = null;
      let outputPath = null;

      try {
        // how many times have we seen this image?
        const refCount = imageRefCounts[entryOutputPath] || 0;

        const pathForImageInDocumentOpts = {
          outputDir: this.outputDir,
          imagePrefix: this.imagePrefix,
          image,
          imageRels: this.imageRels,
          entryImage,
          refCount,
        };

        // if a custom callback is provided, use it.
        if (this.pathForImageInDocument) {
          outputPath = this.pathForImageInDocument(pathForImageInDocumentOpts);
        }

        // if there's no output path (either there was no custom callback, or it returned null)
        // use the default callback
        if (!outputPath) {
          outputPath = defaultMakeCroppedImagePath(pathForImageInDocumentOpts);
        }

        result = await maybeCropImage(image, entryOutputPath, outputPath);

        if (result) {
          // we saved a cropped image, so update the ref count for its source path.
          imageRefCounts[entryOutputPath] = (imageRefCounts[entryOutputPath] || 0) + 1;
        } else {
          if (entryOutputPath !== outputPath) {
            // if the requested output file is different to the original entry, make a copy with the new name.
            await fsp.copyFile(entryOutputPath, outputPath);
          }
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
      if (result) {
        // if result is null then there was no image saved.
        this.imageInfos.push(result);
      }
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
  CropError,
  EntryHandler,
  EntryImageInfo,
  Extracts,
  ImageInfo,
  PathForEntryImageCallback,
  PathForImageInDocumentCallback,
  defaultMakeCroppedImagePath,
  getReadDOCXOpts,
  isImage,
  makeOutputFilePath,
};
