/*
Inside a docx file, a document.xml.rels file stores 'relationships'.

One such relationship is an id mapped to an image path. E.g.:

```
<Relationship
  Id="rId648"
  Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
  Target="media/image335.jpeg"/>
```
*/
const xpath = require("xpath");
const { Entry } = require("yauzl");

const { parseFile } = require("../xml-parse");
const usedInJSDoc = require("../jsdoc");

usedInJSDoc(Entry);

/**
@typedef Relationship
@type {object}
@property {string} id
@property {string} type
@property {string} target
*/

function validateDocument(doc) {
  if (doc === undefined || doc === null) {
    throw new Error(`doc is null/undefined`);
  }
  const { localName } = doc.documentElement;
  const expectedLocalName = "Relationships";
  if (localName !== expectedLocalName) {
    throw new Error(`document.documentElement.localName is "${localName}" when "${expectedLocalName}" was expected. Check that document is really a "document.xml.rels".`);
  }
}

function getRelationships(documentXmlRels) {
  return xpath.select("//*[local-name(.)='Relationship']", documentXmlRels);
}

async function getRelationshipsFromFile(documentXmlRelsPath) {
  const doc = await parseFile(documentXmlRelsPath);
  validateDocument(doc);
  return getRelationships(doc);
}

/**
 * @param {Document} documentXmlRels
 * @return {Object.<string, Relationship>} Dictionary of image relationships, keyed by id.
 */
function getImages(documentXmlRels) {
  const relationships = getRelationships(documentXmlRels);
  const rels = {};
  relationships
    // actual Type will be "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
    .filter((r) => r.getAttribute("Type").endsWith("/image"))
    .forEach((r) => {
      rels[r.getAttribute("Id")] = {
        id: r.getAttribute("Id"),
        target: r.getAttribute("Target"),
        type: r.getAttribute("Type"),
      };
    });
  return rels;
}

async function getImagesFromFile(documentXmlRelsPath) {
  const doc = await parseFile(documentXmlRelsPath);
  validateDocument(doc);
  return getImages(doc);
}

/**
 * @param {Relationship} rel
 * @return {boolean} true if `rel.type` is an image type
 */
function isImageRel(rel) {
  return (rel.type === "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image");
}

/**
 * @param {string} target
 * @param {Relationship[]} rels An array of relationship objects.
 * @return {Relationship} The relationship, if found, else null.
 */
function findRelByTarget(target, rels) {
  if (!target) {
    throw new Error("target should be non-empty string");
  }
  const found = Object.values(rels)
    .find((rel) => (rel.target === target));
  return found || null;
}

/**
 * @param {Entry} entry
 * @param {Relationship[]} rels An array of relationship objects.
 * @return {Relationship} The relationship, if found, else null.
 */
function findRelForEntry(entry, rels) {
  if (!entry || !entry.fileName) {
    throw new Error("entry should be an object with a fileName property");
  }
  const match = /^word\/(.*)/.exec(entry.fileName);
  if (!match) {
    return null;
  }
  return findRelByTarget(match[1], rels);
}

module.exports = {
  findRelByTarget,
  findRelForEntry,
  getImages,
  getImagesFromFile,
  getRelationships,
  getRelationshipsFromFile,
  isImageRel,
};
