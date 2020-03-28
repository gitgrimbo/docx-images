import * as fs from "fs";
import * as path from "path";

import concat = require("concat-stream");
import devNull = require("dev-null");
import mkdirp = require("make-dir");

function read(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    stream.on("error", reject);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stream.pipe(concat(resolve) as any as NodeJS.WritableStream);
  });
}

function ignore(stream: NodeJS.ReadableStream): Promise<void> {
  return new Promise((resolve, reject) => {
    stream.on("error", reject);
    stream.on("end", resolve);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stream.pipe(devNull() as any as NodeJS.WritableStream);
  });
}
/**
 * Writes `readStream` to `outputPath`.
 * @param {NodeJS.ReadableStream} readStream
 * @param {string} outputPath
 * @return Promise<void>
 */
async function writeToFile(readStream: NodeJS.ReadableStream, outputPath: string): Promise<void> {
  await mkdirp(path.dirname(outputPath));

  return new Promise((resolve, reject) => {
    let rejected = false;

    const combinedReject = (err): void => {
      if (rejected) {
        return;
      }
      rejected = true;
      reject(err);
    };

    const destination = fs.createWriteStream(outputPath);

    // resolve when the data has all been WRITTEN
    destination.on("finish", resolve);
    destination.on("error", combinedReject);
    readStream.on("error", combinedReject);
    readStream.pipe(destination);
  });
}

export {
  read,
  ignore,
  writeToFile,
};
