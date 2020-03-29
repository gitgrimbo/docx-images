import * as xpath from "xpath";
import * as chai from "chai";

import { resolveTestFile } from "../../test/test-utils";
import { parseFile } from "../../xml-parse";
import {
  findOutermostRelatedParagraph,
  namespaces,
} from "../document.xml";
import { paraId } from "../paragraph";

const { expect } = chai;

describe("/docx/document.xml.ts", () => {
  let doc;
  let select;

  before(async () => {
    doc = await parseFile(resolveTestFile("xml-query.test.xml"));
    select = xpath.useNamespaces(namespaces);
  });

  describe("findOutermostRelatedParagraph", () => {
    it("null", async () => {
      const actual = findOutermostRelatedParagraph(null);
      expect(actual).to.be.null;
    });

    it("undefined", async () => {
      const actual = findOutermostRelatedParagraph(undefined);
      expect(actual).to.be.null;
    });

    it("regular image", async () => {
      const [blip] = select(`(//a:blip)[1]`, doc) as Element[];
      const actual = findOutermostRelatedParagraph(blip);
      expect(actual).to.not.be.null;
      expect(paraId(actual)).to.equal("772F3716");
    });

    it("image in table", async () => {
      // @descr is how word stores Alt text for an image
      const [docPr] = select(`(//wp:docPr[@descr='image-in-table'])[1]`, doc) as Element[];
      const actual = findOutermostRelatedParagraph(docPr);
      expect(actual).to.not.be.null;
      expect(paraId(actual)).to.equal("73684427");
    });
  });
});
