import * as chai from "chai";
import * as yauzl from "yauzl";

import {
  findRelForEntry,
  Relationship,
} from "../document.xml.rels";
import Dictionary from "../../Dictionary";

const { expect } = chai;

/**
 * @param {any} expected The fixture's expected value.
 * @return {string} The display string for the expected value.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function expectedStr(expected: any): string {
  if (expected === Error) {
    return "Error";
  }
  return JSON.stringify(expected);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function testName(entry: yauzl.Entry, rels: Dictionary<Relationship>, expected: any, i: number): string {
  return [
    `${i}:`,
    "findRelForEntry(",
    entry ? JSON.stringify(entry) : String(entry),
    ",",
    rels ? JSON.stringify(rels) : String(rels),
    ")",
    " is ",
    expectedStr(expected),
  ].join("");
}

describe("/docx/document.xml.rels.ts", () => {
  describe("findRelForEntry", () => {
    const goodEntry = { fileName: "word/media/image1.png" } as yauzl.Entry;
    const goodRel = {
      id: "rId4",
      type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
      target: "media/image1.png",
    };
    const goodRels = {
      [goodRel.id]: goodRel,
    };
    type FixtureItem = [
      yauzl.Entry | undefined | null,
      Dictionary<Relationship> | undefined | null,
      Relationship | ErrorConstructor | null,
    ];
    const fixtures: FixtureItem[] = [
      [undefined, undefined, Error],
      [null, undefined, Error],
      [undefined, null, Error],
      [null, null, Error],
      [{} as yauzl.Entry, null, Error],
      [goodEntry, null, Error],
      [goodEntry, {}, null],
      [goodEntry, goodRels, goodRel],
    ];
    fixtures.forEach(([entry, rels, expected], i) => {
      const name = testName(entry, rels, expected, i);
      it(name, () => {
        const test = (): Relationship => findRelForEntry(entry, rels);
        if (expected === Error) {
          expect(test).to.throw();
        } else {
          const actual = test();
          expect(actual).to.be.equal(expected);
        }
      });
    });
  });
});
