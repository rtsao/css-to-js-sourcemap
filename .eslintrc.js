module.exports = {
  parser: "babel-eslint",
  parserOptions: {
    ecmaVersion: 2017,
  },
  env: {
    es6: true
  },

  extends: [
    "eslint:recommended"
  ],

  plugins: ["eslint-plugin-prettier"],

  rules: {
    "prettier/prettier": [
      "error",
      {
        useTabs: false,
        printWidth: 80,
        tabWidth: 2,
        singleQuote: false,
        trailingComma: "all",
        bracketSpacing: false,
        jsxBracketSameLine: false,
        parser: "babylon",
        semi: true
      }
    ]
  }
};
