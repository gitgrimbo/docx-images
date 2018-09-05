/*
Images in a document.xml file can be encoded at <blip> tags. The "embed" attributes in a <blip>
tag can refer to a Relationship in the document.xml.rels file. E.g.:

```
<a:blip r:embed="rId648">
  <a:extLst>
    <a:ext uri="{28A0092B-C50C-407E-A947-70E740481C1C}">
      <a14:useLocalDpi xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main" val="0"/>
    </a:ext>
  </a:extLst>
</a:blip>
```

There may be a <scrRect> sibling of <blip>. This tells you how to clip the image. The attrs are:

- l: The left margin of the crop. From the left-side of the image.
- r: The right margin of the crop. From the right-side of the image.
- t: The top margin of the crop. From the top of the image.
- b: The bottom margin of the crop. From the bottom of the image.

These attrs are measured in 1/1000%. So in the following example, the crop-left is at 25.510% of
the image width and the crop-right is at 63.045%

```
<a:srcRect l="25510" t="40988" r="63045" b="33006"/>
```
*/
const xpath = require("xpath");

const { parseFile } = require("../xml-parse");
const { closest } = require("../xml-query");

/**
@typedef SrcRect
@type {object}
@property {string} l left
@property {string} t top
@property {string} r right
@property {string} b bottom
*/

/**
@typedef Extent
@type {object}
@property {string} cx
@property {string} cy
*/

/**
@typedef DocxImage
@type {object}
@property {string} embed
@property {SrcRect} srcRect
@property {Extent} extent
*/

function validateDocument(doc) {
  if (doc === undefined || doc === null) {
    throw new Error(`doc is null/undefined`);
  }
  const { localName } = doc.documentElement;
  const expectedLocalName = "document";
  if (localName !== expectedLocalName) {
    throw new Error(`document.documentElement.localName is "${localName}" when "${expectedLocalName}" was expected. Check that document is really a "document.xml".`);
  }
}

/**
 * @param {Document} documentXml
 * @return {DocxImage[]} images
 */
function getImages(documentXml) {
  validateDocument(documentXml);

  const blips = xpath.select("//*[local-name(.)='blip']", documentXml);
  return blips
    .filter((b) => b.getAttribute("r:embed"))
    .map((b) => {
      let srcRect;
      const blipFill = closest(b.parentNode, "blipFill");
      if (blipFill) {
        const srcRects = xpath.select("*[local-name(.)='srcRect']", blipFill);
        if (srcRects.length > 0) {
          srcRect = {
            l: srcRects[0].getAttribute("l"),
            r: srcRects[0].getAttribute("r"),
            t: srcRects[0].getAttribute("t"),
            b: srcRects[0].getAttribute("b"),
          };
        }
      }

      let extent;
      const anchor = closest(b, "anchor");
      if (anchor) {
        const extents = xpath.select("*[local-name(.)='extent']", anchor);
        if (extents.length > 0) {
          extent = {
            cx: extents[0].getAttribute("cx"),
            cy: extents[0].getAttribute("cy"),
          };
        }
      }

      return {
        embed: b.getAttribute("r:embed"),
        srcRect,
        extent,
      };
    });
}

async function getImagesFromFile(documentXmlPath) {
  return getImages(await parseFile(documentXmlPath));
}

/**
 * @typedef {Object} CropRect
 * @property {number} left
 * @property {number} top
 * @property {number} width
 * @property {number} height
 */

/**
 * Gets the { left, top, width, height } for a given srcRect and image width/height.
 *
 * @param {object} srcRect
 * @param {number} width
 * @param {number} height
 * @return {CropRect} The crop rect.
 */
function getCropRect(srcRect, width, height) {
  const setFromSrcRect = (str, scale) => {
    const n = parseInt(str, 10);
    if (Number.isNaN(n)) {
      return 0;
    }
    // srcRect values are in 1/1000%s.
    // e.g. if srcRect.l === 50000, that means it should be 50% of real width/height
    return (n / 100000) * scale;
  };

  const l = setFromSrcRect(srcRect.l, width);
  const t = setFromSrcRect(srcRect.t, height);
  // r and b are how much to crop in from the right and bottom edges, respectively.
  const r = width - setFromSrcRect(srcRect.r, width);
  const b = height - setFromSrcRect(srcRect.b, height);
  const w = r - l;
  const h = b - t;

  return {
    left: l,
    top: t,
    width: w,
    height: h,
  };
}

module.exports = {
  getImages,
  getImagesFromFile,
  getCropRect,
};
