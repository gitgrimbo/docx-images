import * as chai from "chai";
import * as yauzl from "yauzl";

import { extractDOCXFile } from "../extracter";
import { isMedia } from "../entry-tests";
import { withTmpDir, resolveTestFile, asyncReaddirp, normaliseAndSortEntryPaths } from "../../test/test-utils";

const { expect } = chai;

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

describe("/docx/extracter.ts", () => {
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
