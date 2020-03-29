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
import * as xpath from "xpath";

import _validateDocument from "./validate-document";
import { parseFile } from "../xml-parse";
import {
  closest,
  element,
  findPrevSiblings,
} from "../xml-query";
import { getParaStyle } from "./paragraph";
import { makePredicateForStyle } from "./predicates";

export interface SrcRect {
  l: string;
  t: string;
  r: string;
  b: string;
}

export interface Extent {
  cx: string;
  cy: string;
}

export interface DocxImage {
  /** The id -> Relationship.id */
  embed: string;
  drawing: Element;
  blip: Element;
  srcRect: SrcRect;
  extent: Extent;
}

export interface CropRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const namespaces = {
  "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
  "wpc": "http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",
  "cx": "http://schemas.microsoft.com/office/drawing/2014/chartex",
  "cx1": "http://schemas.microsoft.com/office/drawing/2015/9/8/chartex",
  "cx2": "http://schemas.microsoft.com/office/drawing/2015/10/21/chartex",
  "cx3": "http://schemas.microsoft.com/office/drawing/2016/5/9/chartex",
  "cx4": "http://schemas.microsoft.com/office/drawing/2016/5/10/chartex",
  "cx5": "http://schemas.microsoft.com/office/drawing/2016/5/11/chartex",
  "cx6": "http://schemas.microsoft.com/office/drawing/2016/5/12/chartex",
  "cx7": "http://schemas.microsoft.com/office/drawing/2016/5/13/chartex",
  "cx8": "http://schemas.microsoft.com/office/drawing/2016/5/14/chartex",
  "mc": "http://schemas.openxmlformats.org/markup-compatibility/2006",
  "aink": "http://schemas.microsoft.com/office/drawing/2016/ink",
  "am3d": "http://schemas.microsoft.com/office/drawing/2017/model3d",
  "o": "urn:schemas-microsoft-com:office:office",
  "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
  "m": "http://schemas.openxmlformats.org/officeDocument/2006/math",
  "v": "urn:schemas-microsoft-com:vml",
  "wp14": "http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing",
  "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
  "w10": "urn:schemas-microsoft-com:office:word",
  "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
  "w14": "http://schemas.microsoft.com/office/word/2010/wordml",
  "w15": "http://schemas.microsoft.com/office/word/2012/wordml",
  "w16cid": "http://schemas.microsoft.com/office/word/2016/wordml/cid",
  "w16se": "http://schemas.microsoft.com/office/word/2015/wordml/symex",
  "wpg": "http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",
  "wpi": "http://schemas.microsoft.com/office/word/2010/wordprocessingInk",
  "wne": "http://schemas.microsoft.com/office/word/2006/wordml",
  "wps": "http://schemas.microsoft.com/office/word/2010/wordprocessingShape",
};

function validateDocument(doc: Document): void {
  _validateDocument(doc, "document", "document.xml");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _nonEnumerableProperty(src: any, name: string, value: any): any {
  return Object.defineProperty(src, name, {
    value,
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

function getImages(documentXml: Document): DocxImage[] {
  validateDocument(documentXml);

  const blips = xpath.select("//*[local-name(.)='blip']", documentXml) as Element[];
  return blips
    .filter((blip) => blip.getAttribute("r:embed"))
    .map((blip) => {
      let srcRect: SrcRect;
      // xmldom only has parentNode
      const blipFill = closest(blip.parentNode, "blipFill");
      if (blipFill) {
        const srcRects = xpath.select("*[local-name(.)='srcRect']", blipFill) as Element[];
        if (srcRects.length > 0) {
          srcRect = {
            l: srcRects[0].getAttribute("l"),
            r: srcRects[0].getAttribute("r"),
            t: srcRects[0].getAttribute("t"),
            b: srcRects[0].getAttribute("b"),
          };
        }
      }

      let extent: Extent;
      const anchor = closest(blip, "anchor");
      if (anchor) {
        const extents = xpath.select("*[local-name(.)='extent']", anchor) as Element[];
        if (extents.length > 0) {
          extent = {
            cx: extents[0].getAttribute("cx"),
            cy: extents[0].getAttribute("cy"),
          };
        }
      }

      const drawing = closest(blip, "drawing");
      const embed = blip.getAttribute("r:embed");

      const result = {
        embed,
        drawing: null,
        blip: null,
        srcRect,
        extent,
      };

      // Exclude the "drawing" and "blip" properties from enumeration.
      // This is because these XML objects can have recursive properties
      // and would crash JSON.stringify().
      _nonEnumerableProperty(result, "drawing", drawing);
      _nonEnumerableProperty(result, "blip", blip);

      return result;
    });
}

async function getImagesFromFile(documentXmlPath: string): Promise<DocxImage[]> {
  return getImages(await parseFile(documentXmlPath));
}

/**
 * Gets the { left, top, width, height } for a given srcRect and image width/height.
 */
function getCropRect(srcRect: SrcRect, width: number, height: number): CropRect {
  const setFromSrcRect = (str: string, scale: number): number => {
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

const isHeading = makePredicateForStyle((foundStyle: string) => foundStyle && foundStyle.startsWith("Heading"));

function findPreviousHeading(startNode: Node): Element | null {
  const startElement = element(startNode);
  const isStartElementParagraph = startElement && startElement.tagName === "w:p";
  const p = isStartElementParagraph ? startElement : closest(startNode, "p");
  return findPrevSiblings(p, (el) => {
    const heading = Boolean(isHeading(el));
    return {
      pass: heading,
      halt: heading,
    };
  })[0];
}

/**
 * Finds the 'outermost related paragraph'.
 *
 * This is a <p> element whose parentNode is <body>, and is either
 * - A true ancestor of node, or
 * - The previous sibling of [the ancestor of node whose parentNode is <body>].
 *
 * @param {Node | null} node
 * @return {Element | null}
 */
function findOutermostRelatedParagraph(node: Node): Element | null {
  /*
  In the case of the ancestor being a <p>

  <w:document>
    <w:body>
      <w:p>      <-- This is the node we want.
        <w:r>
          <mc:AlternateContent>
            <mc:Choice>
              <w:drawing>
                <wp:anchor>
                  <a:graphic>
                    <a:graphicData>
                      <wps:wsp>
                        <wps:txbx>
                          <w:txbxContent>
                            <w:p>      <-- We DON'T want this node.
                              <w:r>
                                <w:drawing>
                                  <wp:inline>
                                    <a:graphic>
                                      <a:graphicData>
                                        <pic:pic>
                                          <pic:blipFill>
                                            <a:blip>

  In the case of the ancestor NOT being a <p>

  <w:document>
    <w:body>
      <w:p />   <-- This is the node we want (prevSibling of the <w:tbl>).
      <w:tbl>   <-- We DON'T want this node.
        <w:tr>
          <w:tc>
            <w:p>
              <w:r>
                <w:drawing>
                  <wp:inline>
                    <a:graphic>
                      <a:graphicData>
                        <pic:pic>
                          <pic:blipFill>
                            <a:blip>
  */

  if (!node) {
    return null;
  }

  const parent = element(node.parentNode);
  if (!parent) {
    return null;
  }

  const parentIsBody = parent.tagName === "w:body";

  if (parentIsBody) {
    while (node) {
      const el = element(node);
      if (el && el.tagName === "w:p") {
        return el;
      }
      node = node.previousSibling;
    }
  }

  const el = element(node);
  if (el && el.tagName === "w:p") {
    if (parentIsBody) {
      return el;
    }
  }

  return findOutermostRelatedParagraph(parent);
}

export {
  findOutermostRelatedParagraph,
  findPreviousHeading,
  getCropRect,
  getImages,
  getImagesFromFile,
  getParaStyle,
  isHeading,
  namespaces,
};
