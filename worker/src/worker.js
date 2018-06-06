/* eslint-env worker */

if (typeof WebAssembly === "undefined") {
  // eslint-disable-next-line no-console
  console.warn("Worker disabled. WebAssembly is required.");
} else {
  import("./main.js");
}
