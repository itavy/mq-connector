'use strict';

const assert = require('assert');

/**
 * Rabbit MQ interface
 */
class RabbitMQ {
  /**
   * @param {Object} di required dependencies for RabbitMq interface
   */
  constructor(di) {
    Reflect.defineProperty(this, 'debug', {
      configurable: false,
      enumerable:   true,
      writable:     false,
      value:        di.debug,
    });

    Reflect.defineProperty(this, 'sourceIdentifier', {
      configurable: false,
      enumerable:   false,
      writable:     false,
      value:        `${di.sourceIdentifier}.RabbitMQ`,
    });

    Reflect.defineProperty(this, 'rejectWithError', {
      configurable: false,
      enumerable:   false,
      writable:     false,
      value:        di.rejectError,
    });

    Reflect.defineProperty(this, 'connection', {
      configurable: true,
      enumerable:   false,
      writable:     true,
      value:        null,
    });

    Reflect.defineProperty(this, 'publishChannel', {
      configurable: true,
      enumerable:   false,
      writable:     true,
      value:        null,
    });

    Reflect.defineProperty(this, 'mqURI', {
      configurable: false,
      enumerable:   false,
      writable:     false,
      value:        null,
    });

    Reflect.defineProperty(this, 'amqplib', {
      configurable: false,
      enumerable:   false,
      writable:     false,
      value:        null,
    });
  }

  /**
   * Connect to message broker
   * @returns {Promise} resolves on succeeded connection
   * @public
   */
  connect() {
    return this.amqplib.connect(this.mqURI)
      .then((connection) => {
        this.debug(`Successful connected to ${this.mqURI}`);
        this.connection = connection;
        return this.connection.createConfirmChannel();
      })
      .then((channel) => {
        this.publishChannel = channel;
        return Promise.resolve();
      })
      .catch((conectError) => {
        this.debug(`Error connecting to MQ broker: ${conectError.message}`);
        return this.rejectWithError({
          name:     'MQ_CONNECT_ERROR',
          source:   `${this.sourceIdentifier}.connect`,
          message:  `Error connecting to MQ broker: ${conectError.message}`,
          severity: 'ERROR',
          cause:    conectError,
        });
      });
  }

  /**
   * Send message to MQ Broker
   * @param {Object} options message details
   * @param {Object} options.message message details
   * @param {Object} options.queue message details
   * @param {Object} [options.exchange] message details
   * @returns {Promise} resolves on success
   * @public
   */
  sendMessage(options) {
    return new Promise((resolve) => {
      let exchange = '';
      if (options.exchange) {
        exchange = options.exchange;
      }
      assert('queue' in options);
      assert('message' in options);
      return resolve(Object.assign({}, options, { exchange }));
    })
      .catch((sendMessageError) => {
        this.debug(`Error sending message: ${sendMessageError.message}`);
        return this.rejectWithError({
          name:     'MQ_SEND_MESSAGE_ERROR',
          source:   `${this.sourceIdentifier}.sendMessage`,
          message:  `Error sending message: ${sendMessageError.message}`,
          severity: 'WARNING',
          cause:    sendMessageError,
        });
      });
  }

}

module.exports = {
  RabbitMQ,
};
