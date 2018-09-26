/* eslint-env browser */

window.worker = new Worker("/worker.js");

const err1 = new Error("Line 5");
const err2 = new Error("Line 6");
const err3 = new Error("Line 7");

window.error1 = toErrorLikeObject(err1);
window.error2 = toErrorLikeObject(err2);
window.error3 = toErrorLikeObject(err3);

function toErrorLikeObject(err) {
  const {stack, stacktrace, message} = err;
  return {stack, stacktrace, message};
}

// A unicode character: 🤪 to ensure the base64 encoding can handle unicode
// See: https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding#The_Unicode_Problem
