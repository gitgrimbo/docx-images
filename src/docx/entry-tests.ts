import * as yauzl from "yauzl";

const isDocumentXml = (entry: yauzl.Entry): boolean => /^word\/document.xml/.test(entry.fileName);
const isDocumentXmlRels = (entry: yauzl.Entry): boolean => /^word\/_rels\/document.xml.rels/.test(entry.fileName);
const isMedia = (entry: yauzl.Entry): boolean => /^word\/media\//.test(entry.fileName);

export {
  isDocumentXml,
  isDocumentXmlRels,
  isMedia,
};
