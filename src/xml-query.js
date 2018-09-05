/**
 * If `node.tagName` equals tagName, then return `node`. Else return the closest ancestor of
 * `node` such that `ancestor.tagName` is tagName. If no such ancestor exists, return `null`.
 * @param {Node} node
 * @param {string} tagName
 * @param {boolean} [localName=true]
 * @return {Node} The closest matching node, else null.
 */
function closest(node, tagName, localName = true) {
  if (!node) {
    return null;
  }
  let n = node;
  while (n) {
    const name = localName ? n.localName : n.tagName;
    if (name === tagName) {
      return n;
    }
    n = n.parentNode;
  }
  return null;
}

function childrenInternal(node, tagName, localName, depth, collectedChildren) {
  if (!node || depth <= 0) {
    return collectedChildren;
  }
  let n = node;
  while (n) {
    const { childNodes } = n;
    childNodes.forEach((child) => {
      const name = localName ? child.localName : child.tagName;
      if (name === tagName) {
        collectedChildren.push(child);
      }
    });
    if (depth > 0) {
      childNodes.forEach((child) => {
        childrenInternal(child, tagName, localName, depth - 1, collectedChildren);
      });
    }
    n = node.parentNode;
  }
  return collectedChildren;
}
/**
 * Return child nodes with matching tagName.
 *
 * @param {Node} node Node to get the children of.
 * @param {*} tagName The tagName to match.
 * @param {boolean} [localName=true]
 * @param {number} [depth=1] If `depth===1` then find direct children only, else go `depth`
 *        levels deep.
 * @return {Node[]} Array of child nodes.
 */
function children(node, tagName, localName = true, depth = 1) {
  return childrenInternal(node, tagName, localName, depth, []);
}

module.exports = {
  children,
  closest,
};
