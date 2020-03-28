import Dictionary from "./Dictionary";
import {
  DocxImage,
  getImages as getImagesFromDocument,
} from "./docx/document.xml";
import {
  Relationship,
  getImages as getImagesFromDocumentRels,
} from "./docx/document.xml.rels";
import {
  isDocumentXml,
  isDocumentXmlRels,
} from "./docx/entry-tests";
import { readDOCXFile } from "./docx/reader";
import { ignore } from "./streams";
import { parseStream } from "./xml-parse";
import * as yauzl from "yauzl";

async function listImages(docxPath): Promise<{
  images: DocxImage[];
  imageRels: Dictionary<Relationship>;
}> {
  let imageRels = null;
  let images = null;
  const opts = {
    shouldHandleEntry(entry: yauzl.Entry): boolean {
      return isDocumentXml(entry) || isDocumentXmlRels(entry);
    },
    entryHandler: async (entry: yauzl.Entry, readStream: NodeJS.ReadableStream): Promise<void> => {
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

export {
  listImages,
};
