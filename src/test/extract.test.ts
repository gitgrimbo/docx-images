import * as path from "path";

import * as chai from "chai";
import * as dirtyChai from "dirty-chai";
import * as fs from "fs-extra";
import * as Jimp from "jimp";
import * as readdirp from "readdirp";
import * as tmp from "tmp-promise";
import * as upath from "upath";
import * as yauzl from "yauzl";

import { readDOCXFile } from "../docx/reader";
import { extractDOCXFile } from "../docx/extracter";
import { isMedia } from "../docx/entry-tests";
import {
  EntryHandler,
  getReadDOCXOpts,
} from "../extract-and-crop";

chai.use(dirtyChai);

const { expect } = chai;

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

function makeTest(
  filename: string,
  expected: string[],
  shouldHandleEntry: (entry: yauzl.Entry) => boolean,
): () => Promise<void> {
  return (): Promise<void> => withTmpDir(async ({ path: outputDir }) => {
    const docxPath = resolveTestFile(filename);
    const defaultOpts = {
      shouldHandleEntry,
    };
    await extractDOCXFile(docxPath, outputDir, defaultOpts);
    const entries = await asyncReaddirp(outputDir);
    const paths = normaliseAndSortEntryPaths(entries);
    expect(paths).to.be.deep.equal(expected);
  });
}

describe("docx/read", () => {
  describe("extractDOCXFile", () => {
    type FixtureItem = [string, string, string[], ((entry: yauzl.Entry) => boolean)?];
    const fixtures: FixtureItem[] = [
      [
        "all",
        "100x100.cropped.docx",
        [
          "[Content_Types].xml",
          "_rels/.rels",
          "docProps/app.xml",
          "docProps/core.xml",
          "word/_rels/document.xml.rels",
          "word/document.xml",
          "word/fontTable.xml",
          "word/media/image1.png",
          "word/settings.xml",
          "word/styles.xml",
          "word/theme/theme1.xml",
          "word/webSettings.xml",
        ],
      ],
      [
        "media only",
        "100x100.cropped.docx",
        [
          "word/media/image1.png",
        ],
        isMedia,
      ],
      [
        "all",
        "blank.docx",
        [
          "[Content_Types].xml",
          "_rels/.rels",
          "docProps/app.xml",
          "docProps/core.xml",
          "word/_rels/document.xml.rels",
          "word/document.xml",
          "word/fontTable.xml",
          "word/settings.xml",
          "word/styles.xml",
          "word/theme/theme1.xml",
          "word/webSettings.xml",
        ],
      ],
    ];

    fixtures.forEach(([description, filename, expected, shouldHandleEntry]) => {
      const testName = `${filename}: ${description}`;
      const test = makeTest(filename, expected, shouldHandleEntry);
      it(testName, test);
    });
  });
});

describe("extract-and-crop", () => {
  type ExpectedItem = [string, number, number];

  async function extractAndCropTest(testFile: string, expected: ExpectedItem[], outputDir: string): Promise<void> {
    console.log(outputDir, "start test");

    // read the docx file using an extract-and-crop EntryHandler
    const docxPath = resolveTestFile(testFile);
    const entryHandler = new EntryHandler(outputDir);
    const opts = getReadDOCXOpts(entryHandler);

    await readDOCXFile(docxPath, opts);

    // assert the expected images have been extracted
    const entries = await asyncReaddirp(outputDir);

    const paths = normaliseAndSortEntryPaths(entries);
    const expectedPaths = normaliseAndSortPaths(expected.map(([entryPath]) => entryPath));
    expect(paths).to.be.deep.equal(expectedPaths);

    // assert the expected images have the expected sizes
    await Promise.all(
      expected.map(async ([entryPath, w, h]) => {
        //console.log(entryPath, "before read");
        const jimpImage = await Jimp.read(path.resolve(outputDir, entryPath));
        //console.log(entryPath, "after read");
        const { width, height } = jimpImage.bitmap;
        expect(width, `${entryPath} width`).to.be.equal(w);
        expect(height, `${entryPath} height`).to.be.equal(h);
      })
    );
  }

  it("100x100.cropped.docx", () => withTmpDir(async ({ path: outputDir }) => {
    return extractAndCropTest("100x100.cropped.docx", [
      ["word/media/image1.png", 100, 100],
      ["word/media/image1.1.png", 50, 50],
    ], outputDir);
  }));

  it("100x100.page-breaks.docx", () => withTmpDir(async ({ path: outputDir }) => {
    return extractAndCropTest("100x100.page-breaks.docx", [
      ["word/media/image1.png", 100, 100],
      ["word/media/image1.1.png", 50, 50],
      ["word/media/image1.2.png", 50, 50],
      ["word/media/image1.3.png", 50, 50],
      ["word/media/image1.4.png", 50, 50],
    ], outputDir);
  }));
});
