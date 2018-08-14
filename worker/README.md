# css-to-js-sourcemap-worker

The purpose of this package is to generate CSS with arbitrary classes that have sourcemaps to arbitrary lines in JS (at runtime). This may be useful for CSS-in-JS abstractions.

Because parsing and generating sourcemaps is expensive, this package provides a web worker implementation so it can be performed off the main thread.

## Worker protocol

```js
type MessageToWorker =
  | {id: "init_wasm", url: string}
  | {
      id: "add_mapped_class",
      className: string,
      stackInfo: ErrorLikeObject,
      stackIndex: number
    }
  | {id: "set_render_interval", interval: number}
  | {id: "clear_render_interval"}
  | {id: "render"}
  | {id: "invalidate"};

type MessageFromWorker =
  {id: "render_css", css: string};

type ErrorLikeObject = {
  stack?: string,
  stacktrace?: string,
  message?: string
};
```

## Sample usage

```js
const worker = new Worker("https://unpkg.com/css-to-js-sourcemap-worker/worker.js");

worker.onmessage = msg => {
  const {id, css} = msg.data;
  if (id === "render_css" && css) {
    const style = document.createElement("style");
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  }
};

const {stack, stacktrace, message} = new Error("create stack trace");

worker.postMessage({
  id: "init_wasm",
  url: "https://unpkg.com/css-to-js-sourcemap-worker/mappings.wasm",
});
worker.postMessage({
  id: "add_mapped_class",
  className: "__debug-1",
  stackInfo: {stack, stacktrace, message},
  stackIndex: 0,
});
worker.postMessage({
  id: "set_render_interval",
  interval: 120,
});
```
