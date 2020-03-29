import * as path from "path";

import * as chai from "chai";
import * as Jimp from "jimp";

import { readDOCXFile } from "../docx/reader";
import {
  EntryHandler,
  getReadDOCXOpts,
  makeOutputFilePath,
  PathForImageInDocumentCallback,
  PathForEntryImageCallback,
} from "../extract-and-crop";
import {
  asyncReaddirp,
  normaliseAndSortEntryPaths,
  normaliseAndSortPaths,
  resolveTestFile,
  withTmpDir,
} from "../test/test-utils";

const { expect } = chai;

describe("/extract-and-crop.ts", () => {
  describe("extract-and-crop", () => {
    type ExpectedItem = [string, number, number];

    async function extractAndCropTest(
      testFile: string,
      expected: ExpectedItem[],
      outputDir: string,
      imagePrefix = "",
      pathForImageInDocument: PathForImageInDocumentCallback = null,
      pathForEntryImage: PathForEntryImageCallback = null,
    ): Promise<void> {
      console.log(outputDir, "start test");

      // read the docx file using an extract-and-crop EntryHandler
      const docxPath = resolveTestFile(testFile);
      const entryHandler = new EntryHandler(outputDir, imagePrefix, {
        pathForImageInDocument,
        pathForEntryImage,
      });
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

    // basic extraction test
    it("100x100.cropped.docx", () => withTmpDir(async ({ path: outputDir }) => {
      return extractAndCropTest("100x100.cropped.docx", [
        ["word/media/image1.png", 100, 100],
        ["word/media/image1.1.png", 50, 50],
      ], outputDir);
    }));

    // basic extraction test
    it("100x100.mixed.docx", () => withTmpDir(async ({ path: outputDir }) => {
      return extractAndCropTest("100x100.mixed.docx", [
        ["word/media/image1.png", 100, 100],
        ["word/media/image1.1.png", 50, 50],
        ["word/media/image1.2.png", 50, 50],
        ["word/media/image1.3.png", 50, 50],
        ["word/media/image1.4.png", 50, 50],
        ["word/media/image1.5.png", 50, 50],
      ], outputDir);
    }));

    it("custom makeCroppedImagePath callback", () => withTmpDir(async ({ path: outputDir }) => {
      const pathForImageInDocument: PathForImageInDocumentCallback = ({
        entryImage,
        refCount,
      }) => {
        const { dir, ext, name } = path.parse(entryImage.outputPath);
        const newName = `${name}.TEST_FOR_ME.${refCount + 1}${ext}`;
        return path.resolve(dir, newName);
      };
      return extractAndCropTest("100x100.cropped.docx", [
        ["word/media/image1.png", 100, 100],
        ["word/media/image1.TEST_FOR_ME.1.png", 50, 50],
      ], outputDir, "", pathForImageInDocument);
    }));

    it("custom makeEntryImagePath callback", () => withTmpDir(async ({ path: outputDir }) => {
      const pathForEntryImage: PathForEntryImageCallback = ({
        outputDir,
        imagePrefix,
        entry,
      }) => {
        const { name, ext, dir } = path.parse(makeOutputFilePath(entry, outputDir, imagePrefix));
        return path.resolve(dir, name + ".TEST_FOR_ME" + ext);
      };
      return extractAndCropTest("100x100.cropped.docx", [
        ["word/media/image1.TEST_FOR_ME.png", 100, 100],
        ["word/media/image1.TEST_FOR_ME.1.png", 50, 50],
      ], outputDir, "", null, pathForEntryImage);
    }));
  });
});
