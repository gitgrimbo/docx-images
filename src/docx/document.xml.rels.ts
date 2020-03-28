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
import * as xpath from "xpath";
import * as yauzl from "yauzl";

import _validateDocument from "./validate-document";
import Dictionary from "../Dictionary";
import { parseFile } from "../xml-parse";

export interface Relationship {
  id: string;
  type: string;
  target: string;
}

function validateDocument(doc: Document): void {
  _validateDocument(doc, "Relationships", "document.xml.rels");
}

function getRelationships(documentXmlRels): Element[] {
  return xpath.select("//*[local-name(.)='Relationship']", documentXmlRels) as Element[];
}

async function getRelationshipsFromFile(documentXmlRelsPath): Promise<Element[]> {
  const doc = await parseFile(documentXmlRelsPath);
  validateDocument(doc);
  return getRelationships(doc);
}

/**
 * @param {Document} documentXmlRels
 * @return {Dictionary<Relationship>} Dictionary of image relationships, keyed by id.
 */
function getImages(documentXmlRels: Document): Dictionary<Relationship> {
  const relationships = getRelationships(documentXmlRels);
  const rels: Dictionary<Relationship> = {};
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

async function getImagesFromFile(documentXmlRelsPath: string): Promise<Dictionary<Relationship>> {
  const doc = await parseFile(documentXmlRelsPath);
  validateDocument(doc);
  return getImages(doc);
}

/**
 * @param {Relationship} rel
 * @return {boolean} true if `rel.type` is an image type
 */
function isImageRel(rel: Relationship): boolean {
  return (rel.type === "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image");
}

/**
 * @param {string} target
 * @param {Dictionary<Relationship>} rels An array of relationship objects.
 * @return {Relationship} The relationship, if found, else null.
 */
function findRelByTarget(target: string, rels: Dictionary<Relationship>): Relationship {
  if (!target) {
    throw new Error("target should be non-empty string");
  }
  const found = Object.values(rels)
    .find((rel) => (rel.target === target));
  return found || null;
}

/**
 * @param {yauzl.Entry} entry
 * @param {Dictionary<Relationship>} rels A Dictionary of relationship objects.
 * @return {Relationship} The relationship, if found, else null.
 */
function findRelForEntry(entry: yauzl.Entry, rels: Dictionary<Relationship>): Relationship {
  if (!entry || !entry.fileName) {
    throw new Error("entry should be an object with a fileName property");
  }
  const match = /^word\/(.*)/.exec(entry.fileName);
  if (!match) {
    return null;
  }
  return findRelByTarget(match[1], rels);
}

export {
  findRelByTarget,
  findRelForEntry,
  getImages,
  getImagesFromFile,
  getRelationships,
  getRelationshipsFromFile,
  isImageRel,
};
