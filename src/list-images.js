const { isDocumentXml, isDocumentXmlRels } = require("./docx/entry-tests");
const { getImages: getImagesFromDocument } = require("./docx/document.xml");
const { getImages: getImagesFromDocumentRels } = require("./docx/document.xml.rels");
const { readDOCXFile } = require("./docx/reader");
const { ignore } = require("./streams");
const { parseStream } = require("./xml-parse");

async function listImages(docxPath) {
  let imageRels = null;
  let images = null;
  const opts = {
    shouldHandleEntry(entry) {
      return isDocumentXml(entry) || isDocumentXmlRels(entry);
    },
    entryHandler: async (entry, readStream) => {
      if (isDocumentXmlRels(entry)) {
        const xml = await parseStream(readStream);
        imageRels = getImagesFromDocumentRels(xml);
      } else if (isDocumentXml(entry)) {
        const xml = await parseStream(readStream);
        images = getImagesFromDocument(xml);
      } else {
        // shouldn't happen, but we have to read the stream if it's given to us.
        await ignore(readStream);
      }
    },
  };
  await readDOCXFile(docxPath, opts);
  return {
    images,
    imageRels,
  };
}

module.exports = {
  listImages,
};
