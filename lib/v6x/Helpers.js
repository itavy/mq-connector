'use strict';

const assert = require('assert');

// eslint-disable-next-line require-jsdoc
const has = (obj, property) => {
  if ((obj === null) || (!obj)) {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(obj, property);
};

module.exports = {
  assert,
  has
};
