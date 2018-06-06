/* eslint-env node */

const path = require("path");

const outputDir = path.resolve(__dirname, "static");

const noMap = {
  entry: "./client.js",
  output: {
    path: outputDir,
    filename: "no-map.js",
  },
  devtool: false,
};

const inlineMap = {
  entry: "./client.js",
  output: {
    path: outputDir,
    filename: "inline-map.js",
  },
  devtool: "inline-source-map",
};

const externalMap = {
  entry: "./client.js",
  output: {
    path: outputDir,
    filename: "external-map.js",
  },
  devtool: "source-map",
};

module.exports = [noMap, inlineMap, externalMap];
