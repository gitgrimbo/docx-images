/*

Sample usage:

docx-images extract --docx src/test/100x100.mixed.docx --output-dir .temp --opts-module PATH_TO/optsModule.sample.js

*/

const path = require("path");

function getNPMGlobalRoot() {
  return require("child_process").execSync("npm root -g").toString().trim();
}

function requireGlobal(modulePath) {
  console.log(modulePath);
  modulePath = path.resolve(getNPMGlobalRoot(), modulePath);
  console.log(modulePath);
  return require(modulePath);
}

const { docx } = requireGlobal("docx-images");
const {
  findPreviousHeading,
  isHeading,
} = docx.documentXML;

const makeCroppedImagePathWithHeading = (() => {
  const myRefCounts = {};
  return ({
    entryImage,
    headingElement,
  }) => {
    const headingText = headingElement.textContent;
    const { ext, dir } = path.parse(entryImage.outputPath);

    const baseName = headingText.replace(/[^A-Za-z0-p]/g, "_");

    const refCount = myRefCounts[baseName] || 0;
    console.log(baseName, refCount, myRefCounts);
    const newName = baseName + `.${refCount + 1}`;
    myRefCounts[baseName] = refCount + 1;
    console.log(baseName, refCount, myRefCounts);

    const newPath = path.resolve(dir, newName + ext);

    console.log(newPath);
    return newPath;
  };
})();

const pathForImageInDocument = ({
  entryImage,
  image,
  refCount,
}) => {
  const { drawing } = image;
  const headingElement = findPreviousHeading(drawing);
  if (isHeading(headingElement)) {
    return makeCroppedImagePathWithHeading({
      entryImage,
      image,
      refCount,
      headingElement,
    });
  }
  return null;
};

module.exports = {
  /**
   * Callback function to provide a name for cropped image.
   */
  pathForImageInDocument,
  /**
   * Set to true if you want fallback (legacy) images to be ignored.
   */
  ignoreFallbackImages: true,
};
