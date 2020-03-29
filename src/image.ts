import * as Jimp from "jimp";

import {
  getCropRect,
  CropRect,
  DocxImage,
  SrcRect,
} from "./docx/document.xml";

export interface CropResult {
  srcPath: string;
  outputPath: string;
  old: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  new: CropRect;
}

async function getCropRectFromJimp(jimpImage: Jimp, srcRect: SrcRect): Promise<CropRect | null> {
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

  return cropRect;
}

async function getCropRectFromPath(imagePath: string, srcRect: SrcRect): Promise<CropRect | null> {
  // read from the original outputPath
  const jimpImage = await Jimp.read(imagePath);
  return getCropRectFromJimp(jimpImage, srcRect);
}

/**
 * Writes an image, but only if it has been cropped in the docx.
 *
 * @param {DocxImage} image An image from getImagesFromDocument().
 * @param {string} srcPath Where to load the original (uncropped) image from.
 * @param {string} outputPath Where to save the (cropped) image.
 * @return {Promise<CropResult | null>} null if no cropping was done, else the
 *   before/after image sizes, and src/output paths.
 */
async function maybeCropImage(image: DocxImage, srcPath: string, outputPath: string): Promise<CropResult | null> {
  const { srcRect, extent } = image;
  const noSrcRect = !image.srcRect || (
    !srcRect.l && !srcRect.t && !srcRect.r && !srcRect.b
  );
  if (noSrcRect && !extent) {
    return null;
  }

  // read from the original outputPath
  let jimpImage = null;

  try {
    jimpImage = await Jimp.read(srcPath);
  } catch (err) {
    console.error(`Image could not be parsed. Maybe file format for "${srcPath}" is not supported by Jimp?`);
    throw err;
  }

  const { width, height } = jimpImage.bitmap;

  const cropRect = await getCropRectFromJimp(jimpImage, srcRect);
  if (!cropRect) {
    return null;
  }

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

export {
  getCropRectFromJimp,
  getCropRectFromPath,
  maybeCropImage,
};
