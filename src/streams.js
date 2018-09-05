const fs = require("fs");
const path = require("path");

const concat = require("concat-stream");
const devNull = require("dev-null");
const mkdirp = require("mkdirp");

/**
 * @param {NodeJS.ReadableStream} stream
 * @return {Promise<Buffer>} The whole stream as a single Buffer.
 */
function read(stream) {
  return new Promise((resolve, reject) => {
    stream.on("error", reject);
    stream.pipe(concat(resolve));
  });
}

/**
 * @param {NodeJS.ReadableStream} stream
 * @return {Promise<void>}.
 */
function ignore(stream) {
  return new Promise((resolve, reject) => {
    stream.on("error", reject);
    stream.on("end", resolve);
    stream.pipe(devNull());
  });
}

/**
 * Writes `readStream` to `outputPath`.
 * @param {NodeJS.ReadableStream} readStream
 * @param {string} outputPath
 * @return Promise<void>
 */
function writeToFile(readStream, outputPath) {
  return new Promise((resolve, reject) => {
    mkdirp(path.dirname(outputPath), (mkdirErr) => {
      if (mkdirErr) {
        reject(mkdirErr);
        return;
      }

      let rejected = false;
      const combinedReject = (err) => {
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
  });
}

module.exports = {
  read,
  ignore,
  writeToFile,
};
