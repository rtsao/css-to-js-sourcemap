/* eslint-env worker */

import * as core from "css-to-js-sourcemap-core";

self.onmessage = handleMessage;

let renderInterval = null;

const actions = {
  init_wasm: msg => {
    core.initWasm(msg.data.url);
  },

  add_mapped_class: msg => {
    const {error, className, stackIndex} = msg.data;
    core.addMappedClass({error, className, stackIndex});
  },

  set_render_interval: msg => {
    const {interval} = msg.data;
    if (renderInterval) {
      clearInterval(renderInterval);
    }
    renderInterval = setInterval(postRenderedCSS, interval);
  },

  clear_render_interval: () => {
    if (renderInterval) {
      clearInterval(renderInterval);
    }
    renderInterval = void 0;
  },

  schedule_render: postRenderedCSS,

  invalidate: () => {
    const css = core.invalidate();
    self.postMessage({
      id: "render_css",
      css,
    });
  },
};

function handleMessage(msg) {
  if (typeof msg.data.id !== "string") {
    throw new Error("Unrecognized message");
  }
  const action = actions[msg.data.id];
  if (action === void 0) {
    throw new Error("Unrecognized message");
  }
  action(msg);
}

function postRenderedCSS() {
  const css = core.renderCSS();
  self.postMessage({
    id: "render_css",
    css,
  });
}
