/* eslint-env worker */

import {SourceMapConsumer} from "source-map/lib/source-map-consumer";
import ErrorStackParser from "error-stack-parser";
import SourceMapUrl from "source-map-url";
import {encode} from "sourcemap-codec";

class Token {
  constructor() {
    this.cancelled = false;
  }
  cancel() {
    this.cancelled = true;
  }
}

const state = {
  sourceNonce: 0,
  invalidationToken: new Token(),
  mapperCache: new Map(),
  sourceCache: new Map(),
  inboundRequests: new Set(),
  // List of mapped class names for batch rendering
  renderQueue: [],
};

function task(fn) {
  const token = state.invalidationToken;
  return result => {
    if (!token.cancelled) {
      return fn(result);
    }
  };
}

export function initWasm(url) {
  SourceMapConsumer.initialize({
    "lib/mappings.wasm": url,
  });
}

export function renderCSS() {
  if (state.renderQueue.length === 0) {
    return "";
  }
  const {rules, segments, sources} = state.renderQueue.reduce(
    (acc, {className, line, source}) => {
      let sourceIndex = acc.sources.indexOf(source);
      if (sourceIndex === -1) {
        sourceIndex = acc.sources.push(source) - 1;
      }
      acc.rules.push(`.${className} {}`);
      acc.segments.push([[0, sourceIndex, line - 1, 0]]);
      return acc;
    },
    {rules: [], segments: [], sources: []},
  );
  state.renderQueue = [];
  const mappings = encode(segments);

  const map = {
    version: 3,
    // Source URLs need to be unique for source maps to reload
    sources: sources.map(source => `${source}?n=${state.sourceNonce}`),
    mappings,
    sourcesContent: sources.map(source => state.sourceCache.get(source)),
  };
  const base64 = encodeBase64(JSON.stringify(map));

  const comment = `/*# sourceMappingURL=data:application/json;charset=utf-8;base64,${base64} */`;
  return `${rules.join("\n")}\n${comment}`;
}

export function addMappedClass({className, stackInfo, stackIndex}) {
  addMappedClassAsync({className, stackInfo, stackIndex});
}

export function invalidate() {
  // Token should be immediately invalidated
  state.invalidationToken.cancel();
  state.invalidationToken = new Token();

  // After invalidation, existing mapped class names should be rendered
  // using the existing sourceCache
  const css = renderCSS();

  state.mapperCache = new Map();
  state.sourceCache = new Map();
  state.sourceNonce++;

  // Replay inbound requests with cleared caches
  for (const request of state.inboundRequests) {
    addMappedClassAsync(request);
  }

  return css;
}

function addMappedClassAsync(request) {
  state.inboundRequests.add(request);
  const {className, stackInfo, stackIndex} = request;
  const location = getLocation(stackInfo, stackIndex);
  return getMapper(location.filename)
    .then(
      task(mapper => {
        const mapped = mapper.originalPositionFor(location);
        if (!state.sourceCache.has(mapped.source)) {
          state.sourceCache.set(
            mapped.source,
            mapper.sourceContentFor(mapped.source),
          );
        }
        state.renderQueue.push({
          className,
          source: mapped.source,
          line: mapped.line,
          column: mapped.column,
        });
        state.inboundRequests.delete(request);
      }),
    )
    .catch(err => {
      // eslint-disable-next-line no-console
      console.warn("Debug worker error", err);
    });
}

function getIdentityMapper(sourceName, sourceContents) {
  return {
    originalPositionFor: ({line, column}) => ({
      line,
      column,
      source: sourceName,
    }),
    sourceContentFor: () => {
      return sourceContents;
    },
  };
}

async function getMapper(filename) {
  const cached = state.mapperCache.get(filename);
  if (cached) {
    return cached;
  }

  const result = fetch(filename)
    .then(
      task(res => {
        return res.text();
      }),
    )
    .then(
      task(src => {
        const regex = new RegExp(SourceMapUrl.regex.source, "g");
        let url;
        let match;
        while ((match = regex.exec(src))) {
          url = match ? match[1] || match[2] || "" : null;
        }
        return url
          ? getMapperFromUrl(url, filename, src)
          : getIdentityMapper(filename, src);
      }),
    );

  state.mapperCache.set(filename, result);
  return result;
}

function getMapperFromUrl(url, filename, src) {
  return getSourceMapJsonFromUrl(url, filename).then(
    task(map => {
      return new SourceMapConsumer(map);
    }),
    // Fallback to identity mapper
    task(() => getIdentityMapper(filename, src)),
  );
}

function getLocation(stackInfo, stackIndex) {
  const frame = ErrorStackParser.parse(stackInfo)[stackIndex];
  if (!frame.fileName) {
    throw new Error("Could not locate file");
  }
  return {
    filename: frame.fileName,
    line: frame.lineNumber,
    column: frame.columnNumber,
  };
}

async function getSourceMapJsonFromUrl(url, filename) {
  if (isDataUrl(url)) {
    return parseDataUrl(url);
  }
  const fullUrl = new URL(url, filename).href;
  return fetch(fullUrl).then(
    task(res => {
      if (res.status === 200) {
        return res.json();
      }
      return Promise.reject();
    }),
  );
}

function isDataUrl(url) {
  return url.substr(0, 5) === "data:";
}

function parseDataUrl(url) {
  const supportedEncodingRegexp = /^data:application\/json;([\w=:"-]+;)*base64,/;
  const match = url.match(supportedEncodingRegexp);
  if (match) {
    const sourceMapStart = match[0].length;
    const encodedSource = url.substr(sourceMapStart);
    const source = decodeBase64(encodedSource);
    return JSON.parse(source);
  } else {
    throw new Error("The encoding of the inline sourcemap is not supported");
  }
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function encodeBase64(str) {
  let result = "";
  for (let char of encoder.encode(str)) {
    result += String.fromCharCode(char);
  }
  return btoa(result);
}

function decodeBase64(str) {
  return decoder.decode(toArrayBuffer(atob(str)));
}

function toArrayBuffer(str) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0; i < str.length; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}
