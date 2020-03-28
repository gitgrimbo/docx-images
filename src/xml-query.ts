import { Node } from "xmldom/lib/dom";

function element(node: Node): Element {
  if (node.nodeType === Node.ELEMENT_NODE) {
    return node as Element;
  }
  return null;
}

/**
 * If `node.tagName` equals tagName, then return `node`. Else return the closest ancestor of
 * `node` such that `ancestor.tagName` is tagName. If no such ancestor exists, return `null`.
 * @param {Node} node
 * @param {string} tagName
 * @param {boolean} [localName=true]
 * @return {Element} The closest matching node, else null.
 */
function closest(node: Node, tagName: string, localName = true): Element {
  if (!node || !element(node)) {
    return null;
  }
  let n = element(node);
  while (n) {
    const name = localName ? n.localName : n.tagName;
    if (name === tagName) {
      return n;
    }
    // xmldom only has parentNode
    n = n.parentNode as Element;
  }
  return null;
}

function childrenInternal(
  node: Node,
  tagName: string,
  localName: boolean,
  depth?: number,
  collectedChildren?: Element[],
): Element[] {
  if (!node || depth <= 0) {
    return collectedChildren;
  }
  let n = node;
  while (n) {
    const { childNodes } = n;
    childNodes.forEach((child) => {
      const el = element(child);
      if (!el) {
        return;
      }
      const name = localName ? el.localName : el.tagName;
      if (name === tagName) {
        collectedChildren.push(el);
      }
    });
    if (depth > 0) {
      childNodes.forEach((child) => {
        const el = element(child);
        if (!el) {
          return;
        }
        childrenInternal(el, tagName, localName, depth - 1, collectedChildren);
      });
    }
    // xmldom only has parentNode
    n = n.parentNode as Element;
  }
  return collectedChildren;
}

/**
 * Return child Elements with matching tagName.
 *
 * @param {Node} node Node to get the children of.
 * @param {string} tagName The tagName to match.
 * @param {boolean} [localName=true]
 * @param {number} [depth=1] If `depth===1` then find direct children only, else go `depth`
 *        levels deep.
 * @return {Element[]} Array of child nodes.
 */
function children(node: Node, tagName: string, localName = true, depth = 1): Element[] {
  return childrenInternal(node, tagName, localName, depth, []);
}

export {
  children,
  closest,
};
