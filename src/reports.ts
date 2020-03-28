import { promises as fsp } from "fs";

import Dictionary from "./Dictionary";
import { DocxImage } from "./docx/document.xml";
import { Relationship } from "./docx/document.xml.rels";

async function printHtmlReport(outputPath: string, images: DocxImage[], imageRels: Dictionary<Relationship>): Promise<void> {
  // html report
  const html = [];
  images.forEach((image) => {
    const { target } = imageRels[image.embed];
    html.push(`<div>${image.embed} ${target} <img src="${target}"></div>`);
  });
  return fsp.writeFile(outputPath, html.join("\n"));
}

export {
  printHtmlReport,
};
