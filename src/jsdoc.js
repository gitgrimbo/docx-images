/**
 * Pass this function a list of identifiers that you use in JSDoc, but don't actually use in code.
 * This will stop eslint complaining that the identifier isn't used.
 *
 * E.g.:
 *
 * ```
 * const { AType } = require("amodule");
 * const { AnotherType } = require("anothermodule");
 * const usedInJSDoc = require("./jsdoc");
 * usedInJSDoc(AType, AnotherType);
 * ```
 */
module.exports = function jsdoc() {
};
