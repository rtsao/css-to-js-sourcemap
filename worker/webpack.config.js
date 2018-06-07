/* eslint-env node */

const path = require("path");
const webpack = require("webpack");

module.exports = {
  entry: "./src/worker.js",
  target: "webworker",
  output: {
    path: path.resolve(__dirname),
    filename: "worker.js",
  },
  plugins: [
    // Ensure a monolithic bundle, despite dynamic import usage
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1,
    }),
  ],
  node: {
    // "fs" is imported in `source-map/lib/source-map-consumer`
    // The code that uses "fs" is unreachable in a browser environment,
    // therefore provide an empty stub
    fs: "empty",
  },
  mode: "production",
};
