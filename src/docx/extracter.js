const path = require("path");

const { readDOCXFile } = require("./reader");

const { writeToFile } = require("../streams");

function makeExtractEntryHandler(outputDir) {
  return async function handler(entry, readStream) {
    const outputPath = path.resolve(outputDir, entry.fileName);
    console.log(`Extracting ${entry.fileName} to ${outputPath}`);
    await writeToFile(readStream, outputPath);
  };
}

async function extractDOCXFile(docxPath, outputDir, defaultOpts) {
  return readDOCXFile(docxPath, {
    entryHandler: makeExtractEntryHandler(outputDir),
    ...defaultOpts,
  });
}

module.exports = {
  extractDOCXFile,
  makeExtractEntryHandler,
};
