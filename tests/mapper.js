/* eslint-env node */

const SourceMapURL = require("source-map-url");
const {SourceMapConsumer} = require("source-map/lib/source-map-consumer");
const {atob} = require("abab");

module.exports = {
  getConsumer,
};

function getMapURL(src) {
  return SourceMapURL.getFrom(src);
}

function getConsumer(src) {
  const url = getMapURL(src);
  const map = parseDataUrl(url);
  return new SourceMapConsumer(map);
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
