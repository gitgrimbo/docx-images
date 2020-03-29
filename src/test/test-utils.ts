import * as path from "path";

import * as fs from "fs-extra";
import * as readdirp from "readdirp";
import * as tmp from "tmp-promise";
import * as upath from "upath";

async function asyncReaddirp(root, opts?: readdirp.ReaddirpOptions): Promise<readdirp.EntryInfo[]> {
  return new Promise((resolve, reject) => {
    const entries = [];
    readdirp(root, opts)
      .on("error", reject)
      .on("end", () => resolve(entries))
      .on("data", (entry) => entries.push(entry));
  });
}

function normaliseAndSortPaths(paths: string[]): string[] {
  return paths
    .map((p) => upath.normalize(p))
    .sort();
}

function normaliseAndSortEntryPaths(entries: readdirp.EntryInfo[]): string[] {
  return normaliseAndSortPaths(entries.map((entry) => entry.path));
}

function withTmpDir(fn: (result: tmp.DirectoryResult) => void): Promise<void> {
  return tmp.dir().then(async (o) => {
    //console.log(o.path, "created");
    try {
      //console.log(o.path, "before fn");
      await fn(o);
      //console.log(o.path, "after fn");
    } finally {
      //console.log(o.path, "before remove");
      // remove tmp dir and contents
      await fs.remove(o.path);
      //console.log(o.path, "after remove");
    }
  });
}

function resolveTestFile(name: string): string {
  return path.resolve(__dirname, name);
}

export {
  asyncReaddirp,
  normaliseAndSortPaths,
  normaliseAndSortEntryPaths,
  resolveTestFile,
  withTmpDir,
};
