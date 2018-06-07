# css-to-js-sourcemap-worker

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
  if (msg.id === "render_css" && msg.css) {
    const style = document.createElement("style");
    style.appendChild(document.createTextNode(msg.css));
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
