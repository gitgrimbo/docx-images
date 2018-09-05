const fs = require("fs");

const { DOMParser } = require("xmldom");

const { read } = require("./streams");

/**
 * @param {NodeJS.ReadableStream} stream
 * @return {Promise<Document>} The XML Document.
 */
async function parseStream(stream) {
  const data = await read(stream);
  const xmlStr = data.toString("utf8");
  return new DOMParser().parseFromString(xmlStr);
}

/**
 * @param {string} filepath
 * @return {Promise<Document>} The XML Document.
 */
async function parseFile(filepath) {
  const stream = fs.createReadStream(filepath);
  return parseStream(stream);
}

module.exports = {
  parseFile,
  parseStream,
};
