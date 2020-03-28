import { promises as fsp } from "fs";

import { Extracts } from "./extract-and-crop";
import { CropResult } from "./image";

async function printHtmlReport(
  reportPath: string,
  imageRoot: string,
  extracts: Extracts,
): Promise<void> {
  const html = [];

  const h = (s: string): void => void html.push(s);
  const css = (props): string => Object.entries(props).map(([key, value]) => `${key}: ${value}`).join("; ");
  const cropBoxCss = (crop: CropResult): string => css({
    left: `${crop.new.left}px`,
    top: `${crop.new.top}px`,
    width: `${crop.new.width}px`,
    height: `${crop.new.height}px`,
  });

  h(`
<style>
html, body {
  font-family: Tahoma, sans-serif;
}
.crop-box {
  position: absolute;
  opacity: 0;
  box-sizing: border-box;
}
.crop-box:hover {
  position: absolute;
  background-color: white;
  border: solid 1px red;
  opacity: 0.5;
}
</style>
`);
  h(`<h1>docx-images Report</h1>`);
  h(`<div>Hovering over the original image alongside a cropped image should reveal its crop box.</div>`);

  const {
    imageInfos,
  } = extracts;
  h(`<h2>Images (${imageInfos.length})</h2>`);
  imageInfos.forEach((imageInfo, imageInfoIdx) => {
    const { image, entryImage, crop, cropError, outputPath } = imageInfo;

    // embed is the id
    h(`<h3>[${imageInfoIdx + 1}] ${image.embed}</h3>`);
    h(`<pre>${JSON.stringify(image, null, 1)}</pre>`);
    if (crop) {
      h(`<pre>${JSON.stringify(crop, null, 1)}</pre>`);
      h(`<h4>Cropped Image</h4>`);
      h(`<div><img src="${crop.outputPath}"></div>`);
      if (entryImage) {
        h(`<h4>Cropped From Original Image</h4>`);
        h(`
        <div style="position: relative">
          <div class="crop-box" style="${cropBoxCss(crop)}"></div>
          <img src="${entryImage.outputPath}">
        </div>
        `);
      }
    } else if (cropError) {
      h(`<pre>${JSON.stringify(cropError, null, 1)}</pre>`);
    } else {
      h(`<pre>${outputPath}</pre>`);
      h(`<div><img src="${outputPath}"></div>`);
    }
    h(`<hr/>`);
  });

  return fsp.writeFile(reportPath, html.join("\n"));
}

export {
  printHtmlReport,
};
