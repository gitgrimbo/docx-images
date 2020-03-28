import { promisify } from "util";

import * as yauzl from "yauzl";

const openZip = promisify<string, yauzl.Options, yauzl.ZipFile>(yauzl.open);

async function readDOCXFile(docxPath: string, defaultOpts): Promise<void> {
  const opts = {
    shouldHandleEntry: null,
    entryHandler: null,
    ...defaultOpts,
  };

  if (!opts.shouldHandleEntry) {
    opts.shouldHandleEntry = (): boolean => true;
  }

  const zipfile = await openZip(docxPath, { lazyEntries: true });
  const openReadStream = promisify(zipfile.openReadStream.bind(zipfile));

  async function handleEntry(entry: yauzl.Entry, handler): Promise<void> {
    const readStream = await openReadStream(entry);
    return handler(entry, readStream);
  }

  return new Promise((resolve, reject) => {
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
}

export {
  readDOCXFile,
};
