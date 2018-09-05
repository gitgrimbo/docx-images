const path = require("path");

const chai = require("chai");
chai.use(require("dirty-chai"));

const { listImages } = require("../list-images");

const { expect } = chai;

/* eslint-disable */
const expected = {
  "blank.docx": {
    "imageRels": {
    },
    "images": [
    ],
  },
  "100x100.docx": {
    "imageRels": {
      "rId4": {
        "id": "rId4",
        "target": "media/image1.png",
        "type": "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
      },
    },
    "images": [
      {
        "embed": "rId4",
        "extent": undefined,
        "srcRect": undefined,
      },
    ],
  },
  "100x100.cropped.docx": {
    "imageRels": {
      "rId4": {
        "id": "rId4",
        "target": "media/image1.png",
        "type": "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
      },
    },
    "images": [
      {
        "embed": "rId4",
        "extent": undefined,
        "srcRect": {
          "b": "25266",
          "l": "25000",
          "r": "25000",
          "t": "24778",
        },
      },
    ],
  }
};
/* eslint-enable */

describe("list-images", () => {
  describe("listImages", () => {
    const fixtures = [
      "blank.docx",
      "100x100.docx",
      "100x100.cropped.docx",
    ];
    fixtures.forEach((filename) => {
      it(filename, async () => {
        const docxPath = path.resolve(__dirname, filename);
        const list = await listImages(docxPath);
        expect(list).to.deep.equal(expected[filename]);
      });
    });
  });
});
