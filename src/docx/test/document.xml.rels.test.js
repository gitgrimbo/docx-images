const chai = require("chai");
chai.use(require("dirty-chai"));

const { findRelForEntry } = require("../document.xml.rels");

const { expect } = chai;

/**
 * @param {any} expected The fixture's expected value.
 * @return {string} The display string for the expected value.
 */
function expectedStr(expected) {
  if (expected === Error) {
    return "Error";
  }
  return JSON.stringify(expected);
}

function testName(entry, rels, expected, i) {
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

describe("docx/document.xml.rels", () => {
  describe("findRelForEntry", () => {
    const goodEntry = { fileName: "word/media/image1.png" };
    const goodRel = {
      id: "rId4",
      type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
      target: "media/image1.png",
    };
    const goodRels = {
      [goodRel.id]: goodRel,
    };
    const fixtures = [
      [undefined, undefined, Error],
      [null, undefined, Error],
      [undefined, null, Error],
      [null, null, Error],
      [{}, null, Error],
      [goodEntry, null, Error],
      [goodEntry, {}, null],
      [goodEntry, goodRels, goodRel],
    ];
    fixtures.forEach(([entry, rels, expected], i) => {
      const name = testName(entry, rels, expected, i);
      it(name, () => {
        const test = () => findRelForEntry(entry, rels);
        if (expected === Error) {
          expect(test).to.throw();
        } else {
          expect(test()).to.be.equal(expected);
        }
      });
    });
  });
});
