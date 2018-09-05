const fs = require("fs");
const { promisify } = require("util");

const writeFile = promisify(fs.writeFile);

/**
 * @param {string} outputPath
 * @param {DocxImage[]} images
 * @param {Object.<string, Relationship>} imageRels
 * @return Promise<void>
 */
async function printHtmlReport(outputPath, images, imageRels) {
  // html report
  const html = [];
  images.forEach((image) => {
    const { target } = imageRels[image.embed];
    html.push(`<div>${image.embed} ${target} <img src="${target}"></div>`);
  });
  return writeFile(outputPath, html.join("\n"));
}

module.exports = {
  printHtmlReport,
};
