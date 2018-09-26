/* eslint-env node */

const SourceMapURL = require("source-map-url");
const {SourceMapConsumer} = require("source-map/lib/source-map-consumer");

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

/**
 * Source maps are not supported in puppeteer so it is not possible
 * to test against the built-in source mapping implementation.
 */

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

function decodeBase64(str) {
  return new Buffer(str, "base64").toString("utf-8");
}
