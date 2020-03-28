/*

For some reason we need a different tsconfig.json file for eslint.

So use that in the "parserOptions.project" value.

*/
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    "project": ["./tsconfig.eslint.json"],
  },
  plugins: [
    "@typescript-eslint",
  ],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  env: {
    "node": true,
    "es6": true,
  },
  // diable some rules for JS files
  // https://github.com/typescript-eslint/typescript-eslint/issues/964#issuecomment-569481854
  rules: {
    // disable the rule for all files
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-var-requires": "off",
  },
  overrides: [
    {
      // enable the rule specifically for TypeScript files
      "files": ["src/**/*.ts"],
      "rules": {
        "@typescript-eslint/explicit-function-return-type": ["error"],
        "@typescript-eslint/no-var-requires": ["error"],
      },
    },
    {
      "files": ["src/**/*.test.js"],
      "env": {
        "mocha": true,
      },
    },
  ],
};
