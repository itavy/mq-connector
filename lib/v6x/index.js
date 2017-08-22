'use strict';

/**
 * @external Amqp
 * @see {@link https://github.com/squaremo/amqp.node}
 */

/**
 * @namespace itavy/ierror
 */
/**
 * @typedef {Object} MqConnector
 * @property {Function} connect
 * @property {Function} sendMessage
 * @property {Function} subscribe
 */
/**
 *
 * @typedef {Object} MqConnectorTypes
 * @property {Symbol} RABBIT_MQ
 */

const RabbitMQ = require('./RabbitMQ').RabbitMQ;
const debug = require('debug');
const errorLib = require('@itavy/ierror');
const promiseOnEvent = require('p-event');
const { has } = require('./Helpers');

const connectorTypes = {
  RABBIT_MQ: Symbol('RABBIT_MQ'),
};


// eslint-disable-next-line require-jsdoc
const getSourceIdentifier = (options) => {
  /* istanbul ignore if */
  if (options.sourceIdentifier) {
    return `${options.sourceIdentifier}.mq-connector`;
  }
  return 'itavy.mq-connector';
};

const connectors = new Map();

connectors.set(connectorTypes.RABBIT_MQ,
  (options) => {
    const rOptions = {
      debug:            debug('itavy:mq-connector:rabbitmq'),
      sourceIdentifier: getSourceIdentifier(options),
      rejectWithError:  errorLib.rejectIError,
      promiseOnEvent,
    };
    if (!has(options, 'amqplib')) {
      rOptions.amqplib = require('amqplib'); // eslint-disable-line global-require, import/no-extraneous-dependencies
    }
    return Reflect.construct(RabbitMQ, [Object.assign({}, rOptions, options)]);
  });


/**
 * Instantiate a MQ connector
 * @param {Symbol} type mq connector type
 * @param {Object} options specific mq connector options
 * @returns {MqConnector} requested mq connector
 */
const getConnector = (type, options) => {
  if (connectors.has(type)) {
    return connectors.get(type)(options);
  }
  throw Error(`Unknown MQ Connector type ${type.toString()}`);
};

module.exports = {
  types: connectorTypes,
  getConnector,
};
