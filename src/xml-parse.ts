import * as fs from "fs";
import { DOMParser } from "xmldom";

import { read } from "./streams";

async function parseStream(stream: NodeJS.ReadableStream): Promise<Document> {
  const data = await read(stream);
  const xmlStr = data.toString("utf8");
  return new DOMParser().parseFromString(xmlStr);
}

async function parseFile(filepath: string): Promise<Document> {
  const stream = fs.createReadStream(filepath);
  return parseStream(stream);
}

export {
  parseFile,
  parseStream,
};
