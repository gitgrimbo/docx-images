import * as xpath from "xpath";

import {
  extractAllRuns,
  getParaStyle,
} from "./paragraph";

type Predicate<T> = (t: T) => boolean;

interface PredicateOpts {
  p?: Element;
  szEl?: Element;
  szElValAttr?: Node;
  szVal?: string;
  tEl?: Element;
  text?: string;
}

/**
 * Makes a predicate that passes more specific paragraph information to a secondary callback.
 *
 * @param {(opts: PredicateOpts) => boolean} predicate
 * @returns
 */
function makeParagraphPredicate(predicate: (opts: PredicateOpts) => boolean): Predicate<Element> {
  return (el: Element): boolean => {
    const predicateOpts: PredicateOpts = {
      p: el,
    };

    const szEl = xpath.select(".//*[local-name(.)='r']/*[local-name(.)='rPr']/*[local-name(.)='sz']", el)[0] as Element;
    predicateOpts.szEl = szEl;
    if (!szEl) {
      return predicate(predicateOpts);
    }

    const szElValAttr = szEl.attributes.getNamedItem("w:val");
    predicateOpts.szElValAttr = szElValAttr;
    if (!szElValAttr) {
      return predicate(predicateOpts);
    }

    const szVal = szElValAttr.nodeValue;
    predicateOpts.szVal = szVal;

    const runs = extractAllRuns(el);

    predicateOpts.tEl = runs.els && runs.els[0];
    predicateOpts.text = runs.text;

    return predicate(predicateOpts);
  };
}

function makePredicateForSize(sizes: string[]): Predicate<Element> {
  return makeParagraphPredicate(({ szVal }) => sizes.includes(szVal));
}

function makePredicateForText(re: RegExp): Predicate<Element> {
  return makeParagraphPredicate(({ text }) => Boolean(text && text.match(re)));
}

/**
 * Returns true, if:
 * - The element is a paragraph, and
 * - The element has a <pStyle> tag with a "w:val" attribute, and
 * - if the `style` parameter:
 *   - is a string. return the found style if the found style equals the `style` string.
 *   - is a RegExp. return the found style if the `style` RegExp matches the found style.
 *   - is a Function. return the found style if the `style` function, called with the found style as a parameter, returns non-null.
 *
 * @param {Element} el
 * @param {(string | RegExp | ((string) => string | null))} style
 * @returns {(string | null)}
 */
function makePredicateForStyle(style: string | RegExp | ((string) => boolean)): Predicate<Element> {
  return (el: Element): boolean => {
    /*
    <w:p w14:paraId="37CF655F" w14:textId="6E0A1433" w:rsidR="000D7FF6" w:rsidRDefault="00001C7E" w:rsidP="007235BD">
      <w:pPr>
        <w:pStyle w:val="Heading1"/>
      </w:pPr>
      <w:r>
        <w:t>Heading One</w:t>
      </w:r>
    </w:p>
    */
    if (!el) {
      return null;
    }
    if (el.tagName !== "w:p") {
      return null;
    }
    const foundStyle = getParaStyle(el);
    if (typeof style === "string") {
      return style === foundStyle;
    }
    if (style instanceof RegExp) {
      return style.test(foundStyle);
    }
    if (style instanceof Function) {
      return style(foundStyle);
    }
    return false;
  };
}

export {
  makeParagraphPredicate,
  makePredicateForSize,
  makePredicateForStyle,
  makePredicateForText,
  Predicate,
  PredicateOpts,
};
