import * as path from "path";
import * as yauzl from "yauzl";

import { readDOCXFile } from "./reader";

import { writeToFile } from "../streams";

function makeExtractEntryHandler(outputDir: string) {
  return async function handler(entry: yauzl.Entry, readStream: NodeJS.ReadableStream): Promise<void> {
    const outputPath = path.resolve(outputDir, entry.fileName);
    console.log(`Extracting ${entry.fileName} to ${outputPath}`);
    await writeToFile(readStream, outputPath);
  };
}

async function extractDOCXFile(docxPath: string, outputDir: string, defaultOpts): Promise<void> {
  return readDOCXFile(docxPath, {
    entryHandler: makeExtractEntryHandler(outputDir),
    ...defaultOpts,
  });
}

export {
  extractDOCXFile,
  makeExtractEntryHandler,
};
