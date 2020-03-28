const path = require("path");

const { getImages: getImagesFromDocument } = require("./docx/document.xml");
const { getImages: getImagesFromDocumentRels, findRelForEntry, isImageRel } = require("./docx/document.xml.rels");
const { isDocumentXml, isDocumentXmlRels, isMedia } = require("./docx/entry-tests");
const { maybeCropImage } = require("./image");
const { parseStream } = require("./xml-parse");
const { ignore, writeToFile } = require("./streams");

function isImage(entry, imageRels) {
  const rel = findRelForEntry(entry, imageRels);
  if (!rel) {
    return false;
  }
  return isImageRel(rel);
}

class EntryHandler {
  constructor(outputDir, imagePrefix) {
    this.outputDir = outputDir;
    this.imagePrefix = imagePrefix || "";
    this.imageRels = null;
    this.images = null;
    this.imageTargetToId = null;
    this.extractedImages = {};
  }

  getImageIdFromEntry(entry) {
    // turn "word/media/image269.jpeg" into "media/image269.jpeg"
    const filenameAsTarget = entry.fileName.replace(/^word\//, "");
    return this.imageTargetToId[filenameAsTarget];
  }

  // eslint-disable-next-line class-methods-use-this
  async maybeCropImage(image, srcPath, outputPath) {
    return maybeCropImage(image, srcPath, outputPath);
  }

  async handleDocumentRels(entry, readStream) {
    const xml = await parseStream(readStream);
    this.imageRels = getImagesFromDocumentRels(xml);

    this.imageTargetToId = Object.keys(this.imageRels).reduce((map, id) => {
      const { target } = this.imageRels[id];
      // eslint-disable-next-line no-param-reassign
      map[target] = id;
      return map;
    }, {});
  }

  async handleDocumentXml(entry, readStream) {
    const xml = await parseStream(readStream);
    this.images = getImagesFromDocument(xml);
  }

  async handleImage(entry, readStream) {
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

      if (result.err) {
        console.log("error", result);
        return;
      }

      // assume cropped
      console.log(id, entry.fileName, `image was cropped to:`);
      console.log(`  ${result.outputPath}, old-size: ${JSON.stringify(result.old)}, new-size: ${JSON.stringify(result.new)}`);
    });
  }

  // eslint-disable-next-line class-methods-use-this
  shouldHandleEntry(entry) {
    return isDocumentXmlRels(entry) || isDocumentXml(entry) || isMedia(entry);
  }

  async entryHandler(entry, readStream) {
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

  outputFilePath(entry) {
    // entry.fileName is the 'virtual' pathname within the zip
    const { base, dir } = path.parse(entry.fileName);

    // e.g. filename = "myprefix" + "image.jpeg"
    const filename = this.imagePrefix + base;

    return path.resolve(this.outputDir, dir, filename);
  }
}

function getReadDOCXOpts(entryHandler) {
  return {
    shouldHandleEntry: entryHandler.shouldHandleEntry.bind(entryHandler),
    entryHandler: entryHandler.entryHandler.bind(entryHandler),
  };
}

module.exports = {
  EntryHandler,
  getReadDOCXOpts,
  isImage,
};
