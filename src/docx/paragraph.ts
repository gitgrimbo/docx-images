import * as xpath from "xpath";

function getParaStyle(para: Element): string {
  const pStyle = xpath.select("./*[local-name(.)='pPr']/*[local-name(.)='pStyle']", para)[0] as Element;
  if (!pStyle) {
    return null;
  }
  const attr = pStyle.attributes.getNamedItem("w:val");
  if (!attr || !attr.nodeValue) {
    return null;
  }
  return attr.nodeValue;
}

function paraId(el: Element): string | null {
  if (!el || !el.attributes || !el.attributes.getNamedItem) {
    return null;
  }
  const attr = el.attributes.getNamedItem("w14:paraId");
  return attr ? attr.nodeValue : null;
}

function extractAllRuns(el, merge = true): {
  els?: Element[];
  text?: string;
} {
  let text = null;

  const tEls = xpath.select(".//*[local-name(.)='r']/*[local-name(.)='t']", el) as Element[];
  if (tEls) {
    if (merge) {
      text = tEls.map((tEl) => tEl.textContent || "").join("");
    }
  }

  return {
    els: tEls,
    text,
  };
}

export {
  extractAllRuns,
  getParaStyle,
  paraId,
};
