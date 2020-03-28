const Jimp = require("jimp");

const { getCropRect } = require("./docx/document.xml");

/**
 * @param {object} image An image from getImagesFromDocument().
 * @param {string} srcPath Where to load the original (uncropped) image from.
 * @param {string} outputPath Where to save the (cropped) image.
 * @return {object} null if no cropping was done, else the before/after image sizes, and
 *         src/output paths.
 */
async function maybeCropImage(image, srcPath, outputPath) {
  const { srcRect, extent } = image;
  const noSrcRect = !image.srcRect || (
    !srcRect.l && !srcRect.t && !srcRect.r && !srcRect.b
  );
  if (noSrcRect && !extent) {
    return null;
  }

  // read from the original outputPath
  const jimpImage = await Jimp.read(srcPath);

  const { width, height } = jimpImage.bitmap;

  const cropRect = getCropRect(srcRect, width, height);

  if ((cropRect.left === 0)
    && (cropRect.top === 0)
    && (cropRect.width === width)
    && (cropRect.height === height)) {
    // same size, no cropping required
    return null;
  }

  cropRect.left = Math.max(0, cropRect.left);
  cropRect.top = Math.max(0, cropRect.top);

  console.log(outputPath, width, height, cropRect, srcRect, extent);

  await jimpImage
    .crop(cropRect.left, cropRect.top, cropRect.width, cropRect.height)
    .write(outputPath);

  const result = {
    srcPath,
    outputPath,
    old: {
      left: 0, top: 0, width, height,
    },
    new: cropRect,
  };

  return result;
}

module.exports = {
  maybeCropImage,
};
