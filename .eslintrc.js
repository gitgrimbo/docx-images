module.exports = {
  "extends": "airbnb-base",
  "env": {
    "node": true,
  },
  "rules": {
    "arrow-parens": ["error", "always"],

    "comma-dangle": [
      "error",
      {
        "arrays": "always-multiline",
        "objects": "always-multiline",
        "imports": "always-multiline",
        "exports": "always-multiline",
        "functions": "never",
      },
    ],

    // leave this up to prettier
    "function-paren-newline": "off",

    // leave this up to prettier
    "implicit-arrow-linebreak": "off",

    "linebreak-style": ["error", "windows"],

    "no-console": "off",

    "quotes": ["error", "double", { "allowTemplateLiterals": true }],
  },
  "overrides": [
    {
      "files": ["*.test.js"],
      "env": {
        "mocha": true,
      },
    },
  ],
};
