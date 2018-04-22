'use strict';

const semver = require('semver');

const minNodeVersion = '6.0.0';

/**
 * check if min nodejs requirements are met
 * @returns {Object} @itavy/mq-structure module
 */
const getVersionModule = () => {
  if (semver.lt(process.version, minNodeVersion)) {
    throw Error(`Invalid node version for @itavy/mq-connector, current: ${process.version}, min: ${minNodeVersion}`);
  }
  if (semver.major(process.version) === semver.major(minNodeVersion)) {
    // eslint-disable-next-line global-require
    return require('./lib/v6x');
  }
  // eslint-disable-next-line global-require
  return require('./lib/latest');
};

module.exports = getVersionModule();
