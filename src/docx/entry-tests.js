const isDocumentXml = (entry) => /^word\/document.xml/.test(entry.fileName);
const isDocumentXmlRels = (entry) => /^word\/_rels\/document.xml.rels/.test(entry.fileName);
const isMedia = (entry) => /^word\/media\//.test(entry.fileName);

module.exports = {
  isDocumentXml,
  isDocumentXmlRels,
  isMedia,
};
