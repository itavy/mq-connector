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

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

var _require = require('./RabbitMQ');

const RabbitMQ = _require.RabbitMQ;

const debug = require('debug');
const defaultAmqpLib = require('amqplib');
const promiseOnEvent = require('p-event');

const connectorTypes = {
  RABBIT_MQ: Symbol('RABBIT_MQ')
};

const connectors = new Map();

connectors.set(connectorTypes.RABBIT_MQ, (_ref) => {
  var _ref$amqplib = _ref.amqplib;
  let amqplib = _ref$amqplib === undefined ? defaultAmqpLib : _ref$amqplib;
  var _ref$sourceIdentifier = _ref.sourceIdentifier;

  let sourceIdentifier = _ref$sourceIdentifier === undefined ? 'itavy' : _ref$sourceIdentifier,
      restOptions = _objectWithoutProperties(_ref, ['amqplib', 'sourceIdentifier']);

  return Reflect.construct(RabbitMQ, [Object.assign({
    debug: debug('itavy:mq-connector:rabbitmq'),
    sourceIdentifier: `${sourceIdentifier}.mq-connector`,
    promiseOnEvent,
    amqplib
  }, restOptions)]);
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
  getConnector
};