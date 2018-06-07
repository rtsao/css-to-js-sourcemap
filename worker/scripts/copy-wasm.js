/* eslint-env node */

const path = require("path");
const fs = require("fs");
const resolveFrom = require("resolve-from");

const corePath = path.dirname(require.resolve("css-to-js-sourcemap-core"));

const wasmPath = path.join(
  path.dirname(resolveFrom(corePath, "source-map")),
  "lib/mappings.wasm",
);

fs.createReadStream(wasmPath).pipe(
  fs.createWriteStream(path.resolve(__dirname, "../mappings.wasm")),
);
