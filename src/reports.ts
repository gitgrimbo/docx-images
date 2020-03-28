import { promises as fsp } from "fs";

import Dictionary from "./Dictionary";
import { CropResult } from "./image";

async function printHtmlReport(
  reportPath: string,
  imageRoot: string,
  extractedImages: string[],
  croppedImages: Dictionary<(CropResult | {
    srcPath: string;
  })[]>,
): Promise<void> {
  const html = [];

  const h = (s: string): void => void html.push(s);

  h(`
<style>
html, body {
  font-family: Tahoma, sans-serif;
}
</style>
`);
  h(`<h1>docx-images Report</h1>`);

  h(`<h2>Uncropped Images (${extractedImages.length})</h2>`);
  extractedImages.forEach((image, imageIdx) => {
    h(`<div>[${imageIdx}] ${image}</div>`);
    h(`<div><img src="${image}"></div>`);
  });

  const croppedImagesKeys = Object.keys(croppedImages);
  const numCroppedImages = croppedImagesKeys.reduce((count, key) => count + croppedImages[key].length, 0);
  h(`<h2>Cropped Images (${numCroppedImages})</h2>`);
  croppedImagesKeys.forEach((key) => {
    const images = croppedImages[key];
    images.forEach((image, imageIdx) => {
      h(`<h3>${key}.${imageIdx + 1}</h3>`);
      if ("outputPath" in image) {
        h(`<div><img src="${image.outputPath}"></div>`);
      }
      h(`<pre>${JSON.stringify(image, null, 1)}</pre>`);
    });
  });
  return fsp.writeFile(reportPath, html.join("\n"));
}

export {
  printHtmlReport,
};
