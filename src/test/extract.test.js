const path = require("path");

const chai = require("chai");
chai.use(require("dirty-chai"));
const fs = require("fs-extra");
const Jimp = require("jimp");
const readdirp = require("readdirp");
const tmp = require("tmp-promise");
const upath = require("upath");

const { readDOCXFile } = require("../docx/reader");
const { extractDOCXFile } = require("../docx/extracter");
const { isMedia } = require("../docx/entry-tests");
const { EntryHandler, getReadDOCXOpts } = require("../extract-and-crop");

const { expect } = chai;

// eslint-disable-next-line camelcase
async function async_readdirp(opts) {
  return new Promise((resolve, reject) => {
    const entries = [];
    readdirp(opts)
      .on("error", reject)
      .on("end", () => resolve(entries))
      .on("data", (entry) => entries.push(entry));
  });
}

function normaliseAndSortPaths(paths) {
  return paths
    .map((p) => upath.normalize(p))
    .sort();
}

function normaliseAndSortEntryPaths(entries) {
  return normaliseAndSortPaths(entries.map((entry) => entry.path));
}

function withTmpDir(fn) {
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

function resolveTestFile(name) {
  return path.resolve(__dirname, name);
}

function makeTest(filename, expected, shouldHandleEntry) {
  return () => withTmpDir(async ({ path: outputDir }) => {
    const docxPath = resolveTestFile(filename);
    const defaultOpts = {
      shouldHandleEntry,
    };
    await extractDOCXFile(docxPath, outputDir, defaultOpts);
    const entries = await async_readdirp({ root: outputDir });
    const paths = normaliseAndSortEntryPaths(entries);
    expect(paths).to.be.deep.equal(expected);
  });
}

describe("docx/read", () => {
  describe("extractDOCXFile", () => {
    const fixtures = [
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
  // eslint-disable-next-line no-shadow
  it("100x100.cropped.docx", () => withTmpDir(async ({ path: outputDir }) => {
    console.log(outputDir, "start test");
    const expected = [
      ["word/media/image1.png", 100, 100],
      ["word/media/image1.crop.1.png", 50, 50],
    ];

    // read the docx file using an extract-and-crop EntryHandler
    const docxPath = resolveTestFile("100x100.cropped.docx");
    const entryHandler = new EntryHandler(outputDir);
    const opts = getReadDOCXOpts(entryHandler);
    //console.log(outputDir, docxPath, "before readDOXCFile");
    await readDOCXFile(docxPath, opts);
    //console.log(outputDir, docxPath, "after readDOXCFile");

    // assert the expected images have been extracted
    //console.log(outputDir, "before readdirp");
    const entries = await async_readdirp({ root: outputDir });
    //console.log(outputDir, "after readdirp");
    const paths = normaliseAndSortEntryPaths(entries);
    const expectedPaths = normaliseAndSortPaths(expected.map(([entryPath]) => entryPath));
    expect(paths).to.be.deep.equal(expectedPaths);

    // assert the expected images have the expected sizes
    await Promise.all(expected.map(async ([entryPath, w, h]) => {
      //console.log(entryPath, "before read");
      const jimpImage = await Jimp.read(path.resolve(outputDir, entryPath));
      //console.log(entryPath, "after read");
      const { width, height } = jimpImage.bitmap;
      expect(width, `${entryPath} width`).to.be.equal(w);
      expect(height, `${entryPath} height`).to.be.equal(h);
    }));
  }));
});
