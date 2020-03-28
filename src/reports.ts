import { promises as fsp } from "fs";

import { ImageInfo } from "./extract-and-crop";

async function printHtmlReport(
  reportPath: string,
  imageRoot: string,
  imageInfos: ImageInfo[],
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

  h(`<h2>Images (${imageInfos.length})</h2>`);
  imageInfos.forEach((imageInfo, imageInfoIdx) => {
    const { image, outputPath, crop, cropError } = imageInfo;
    // embed is the id
    h(`<h3>[${imageInfoIdx + 1}] ${image.embed}</h3>`);
    if (crop) {
      h(`<div><img src="${crop.outputPath}"></div>`);
      h(`<pre>${JSON.stringify(crop, null, 1)}</pre>`);
    } else if (cropError) {
      h(`<pre>${JSON.stringify(cropError, null, 1)}</pre>`);
    } else {
      h(`<div><img src="${outputPath}"></div>`);
      h(`<pre>${outputPath}</pre>`);
    }
  });

  return fsp.writeFile(reportPath, html.join("\n"));
}

export {
  printHtmlReport,
};
