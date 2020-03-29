import * as chai from "chai";
import { Readable } from "stream";
import * as xpath from "xpath";

import { resolveTestFile } from "../../test/test-utils";
import {
  parseFile,
  parseStream,
} from "../../xml-parse";
import { namespaces } from "../document.xml";
import { extractAllRuns } from "../paragraph";

const { expect } = chai;

describe("/docx/paragraph.ts", () => {
  let doc;
  let select;

  before(async () => {
    doc = await parseFile(resolveTestFile("xml-query.test.xml"));
    select = xpath.useNamespaces(namespaces);
  });

  it("extractAllRuns 1 - multiple <w:t> per <w:p>", async () => {
    const xml = `
<w:p
      w14:paraId="2675B3A4"
      w14:textId="77777777"
      w:rsidR="008520D7"
      w:rsidRPr="008520D7"
      w:rsidRDefault="008520D7"
      w:rsidP="008520D7"
    ><w:pPr><w:jc w:val="center" /><w:rPr><w:rFonts
            w:ascii="Times New Roman"
            w:hAnsi="Times New Roman"
            w:cs="Times New Roman"
          /><w:sz w:val="44" /><w:szCs w:val="44" /></w:rPr></w:pPr><w:r
        w:rsidRPr="008520D7"
      ><w:rPr><w:rFonts
            w:ascii="Times New Roman"
            w:hAnsi="Times New Roman"
            w:cs="Times New Roman"
          /><w:b /><w:sz w:val="44" /><w:szCs
            w:val="44"
          /></w:rPr><w:lastRenderedPageBreak /><w:t>16/</w:t></w:r><w:r
        w:rsidR="00E770C1"
      ><w:rPr><w:rFonts
            w:ascii="Times New Roman"
            w:hAnsi="Times New Roman"
            w:cs="Times New Roman"
          /><w:b /><w:sz w:val="44" /><w:szCs w:val="44" /></w:rPr><w:t
        >0</w:t></w:r><w:r w:rsidRPr="008520D7"><w:rPr><w:rFonts
            w:ascii="Times New Roman"
            w:hAnsi="Times New Roman"
            w:cs="Times New Roman"
          /><w:b /><w:sz w:val="44" /><w:szCs w:val="44" /></w:rPr><w:t
        >1/1938</w:t></w:r></w:p>
`;
    const doc = await parseStream(Readable.from(xml.trim()));
    const actual = extractAllRuns(doc.documentElement);
    expect(actual).to.not.be.null;
    expect(actual).to.be.an("object");
    expect(actual.text).to.equal("16/01/1938");
    expect(actual.els).to.be.an("array");
    expect(actual.els).to.have.lengthOf(3);
  });

  it("extractAllRuns 2 - multiple <w:t> per <w:p>", async () => {
    const xml = `
<w:p
      w14:paraId="79AA7D54"
      w14:textId="77777777"
      w:rsidR="00E54EF5"
      w:rsidRPr="00E54EF5"
      w:rsidRDefault="00E54EF5"
      w:rsidP="00B41F15"
    ><w:pPr><w:jc w:val="center" /><w:rPr><w:rFonts
            w:cs="Times New Roman"
          /><w:b /><w:i /><w:sz w:val="32" /><w:szCs
            w:val="32"
          /></w:rPr></w:pPr><w:r w:rsidRPr="00E54EF5"><w:rPr><w:rFonts
            w:cs="Times New Roman"
          /><w:b /><w:i /><w:sz w:val="32" /><w:szCs
            w:val="32"
          /></w:rPr><w:lastRenderedPageBreak /><w:t
        >PEN PICTURES</w:t></w:r></w:p>
`;
    const doc = await parseStream(Readable.from(xml.trim()));
    const actual = extractAllRuns(doc.documentElement);
    expect(actual).to.not.be.null;
    expect(actual).to.be.an("object");
    expect(actual.text).to.equal("PEN PICTURES");
    expect(actual.els).to.be.an("array");
    expect(actual.els).to.have.lengthOf(1);
  });
});
