import * as xpath from "xpath";
import * as chai from "chai";

import {
  closest,
  findPrevSiblings,
} from "../xml-query";
import { parseFile } from "../xml-parse";
import { resolveTestFile } from "./test-utils";
import {
  isHeading,
  namespaces,
  getParaStyle,
} from "../docx/document.xml";

const { expect } = chai;

describe("/xml-query.ts", () => {
  let doc;
  let select;

  before(async () => {
    doc = await parseFile(resolveTestFile("xml-query.test.xml"));
    select = xpath.useNamespaces(namespaces);
  });

  describe("closest", () => {
    it("finds closest local-name", async () => {
      const [blip] = select(`(//*[@r:embed='rId4'])[1]`, doc) as Element[];
      const localName = "p";
      const expectedTagName = "w:p";
      const actual = closest(blip, localName, true);
      expect(actual).to.not.be.null;
      expect(actual.tagName).to.equal(expectedTagName);
    });

    it("finds closest non-local-name", async () => {
      const [blip] = select(`(//*[@r:embed='rId4'])[1]`, doc) as Element[];
      const nonLocalName = "w:p";
      const actual = closest(blip, nonLocalName, false);
      expect(actual).to.not.be.null;
      expect(actual.tagName).to.equal(nonLocalName);
    });
  });

  describe("findPrevSiblings", () => {
    const findPreviousHeading = (startNode: Node): Element => {
      const p = closest(startNode, "p");
      return findPrevSiblings(p, (el) => {
        const heading = Boolean(isHeading(el));
        return {
          pass: heading,
          halt: heading,
        };
      })[0];
    };

    it("finds previous sibling - Heading1", async () => {
      const [docPr] = select(`(//wp:docPr[@id='2'])[1]`, doc) as Element[];
      const actual = findPreviousHeading(docPr);
      expect(actual).to.not.be.null;
      expect(isHeading(actual)).to.be.true;
      expect(getParaStyle(actual)).to.equal("Heading1");
    });

    it("finds previous sibling - Heading2", async () => {
      const [docPr] = select(`(//wp:docPr[@id='5'])[1]`, doc) as Element[];
      const actual = findPreviousHeading(docPr);
      expect(actual).to.not.be.null;
      expect(isHeading(actual)).to.be.true;
      expect(getParaStyle(actual)).to.equal("Heading1");
    });
  });
});
