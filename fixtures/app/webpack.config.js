/* eslint-env node */

const path = require("path");

const outputDir = path.resolve(__dirname, "public/_static");

const noMap = {
  entry: "./client.js",
  output: {
    path: outputDir,
    filename: "no-map.js",
  },
  devtool: false,
  mode: "production",
};

const inlineMap = {
  entry: "./client.js",
  output: {
    path: outputDir,
    filename: "inline-map.js",
  },
  devtool: "inline-source-map",
  mode: "production",
};

const externalMap = {
  entry: "./client.js",
  output: {
    path: outputDir,
    filename: "external-map.js",
  },
  devtool: "source-map",
  mode: "production",
};

module.exports = [noMap, inlineMap, externalMap];
