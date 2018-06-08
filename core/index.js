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

let invalidationToken = new Token();

function task(fn) {
  const token = invalidationToken;
  return result => {
    if (!token.cancelled) {
      return fn(result);
    }
  };
}

const state = {
  mapperCache: new Map(),
  sourceCache: new Map(),
  inboundRequests: new Set(),
  // List of mapped class names for batch rendering
  renderQueue: [],
};

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
    sources,
    mappings,
    sourcesContent: sources.map(source => state.sourceCache.get(source)),
  };
  const json = JSON.stringify(map);
  const base64 = btoa(json);

  const comment = `/*# sourceMappingURL=data:application/json;charset=utf-8;base64,${base64} */`;
  return `${rules.join("\n")}\n${comment}`;
}

export function addMappedClass({className, stackInfo, stackIndex}) {
  addMappedClassAsync({className, stackInfo, stackIndex});
}

export function invalidate() {
  // Token should be immediately invalidated
  invalidationToken.cancel();
  invalidationToken = new Token();

  // After invalidation, existing mapped class names should be rendered
  // using the existing sourceCache
  const css = renderCSS();

  state.mapperCache = new Map();
  state.sourceCache = new Map();

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
        const url = SourceMapUrl.getFrom(src);
        return url ? getMapperFromUrl(url) : getIdentityMapper(filename, src);
      }),
    );

  state.mapperCache.set(filename, result);
  return result;
}

function getMapperFromUrl(url) {
  return getSourceMapJsonFromUrl(url).then(
    task(map => {
      return new SourceMapConsumer(map);
    }),
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

async function getSourceMapJsonFromUrl(url) {
  return isDataUrl(url)
    ? parseDataUrl(url)
    : fetch(url).then(
        task(res => {
          return res.json();
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
    const source = atob(encodedSource);
    return JSON.parse(source);
  } else {
    throw new Error("The encoding of the inline sourcemap is not supported");
  }
}
