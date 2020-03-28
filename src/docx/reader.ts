import { promisify } from "util";

import * as yauzl from "yauzl";

const openZip = promisify<string, yauzl.Options, yauzl.ZipFile>(yauzl.open);

export type Handler = (entry: yauzl.Entry, readStream: NodeJS.ReadableStream) => Promise<void>;
export type ShouldHandleEntry = (entry: yauzl.Entry) => boolean;

async function readDOCXFile(docxPath: string, defaultOpts): Promise<void> {
  const opts = {
    shouldHandleEntry: null,
    entryHandler: null,
    onFinish: null,
    ...defaultOpts,
  };

  if (!opts.shouldHandleEntry) {
    opts.shouldHandleEntry = (): boolean => true;
  }

  const zipfile = await openZip(docxPath, { lazyEntries: true });
  const openReadStream = promisify(zipfile.openReadStream.bind(zipfile));

  async function handleEntry(entry: yauzl.Entry, handler: Handler): Promise<void> {
    const readStream = await openReadStream(entry);
    return handler(entry, readStream);
  }

  await new Promise((resolve, reject) => {
    zipfile.on("close", resolve);

    zipfile.on("error", reject);

    zipfile.on("entry", async (entry: yauzl.Entry) => {
      // directory ends with "/"
      const isDirectory = /\/$/.test(entry.fileName);

      if (isDirectory || !opts.shouldHandleEntry(entry)) {
        // proceed with the next entry, skip extraction.
        zipfile.readEntry();
        return;
      }

      try {
        if (opts.entryHandler) {
          await handleEntry(entry, opts.entryHandler);
        }
      } catch (err) {
        err.entry = entry;
        // stop extraction
        reject(err);
        return;
      }

      // proceed with the next entry
      zipfile.readEntry();
    });

    // read first  entry
    zipfile.readEntry();
  });

  if (opts.onFinish) {
    await opts.onFinish();
  }
}

export {
  readDOCXFile,
};
