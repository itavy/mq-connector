'use strict';

const semver = require('semver');
const v6x = require('./lib/v6x');

const minNodeVersion = 'v6.9.1';

/**
 * check if min nodejs requirements are met
 * @returns {Object} @itavy/mq-structure module
 */
const getVersionModule = () => {
  if (semver.gte(process.version, minNodeVersion)) {
    return v6x;
  }
  throw Error(`Invalid node version for @itavy/mq-connector, current: ${process.version}, min: ${minNodeVersion}`);
};

module.exports = getVersionModule();
