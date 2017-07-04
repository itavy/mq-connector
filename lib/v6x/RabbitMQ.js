'use strict';

// eslint-disable-next-line require-jsdoc
const has = (obj, property) => {
  if (obj === null) {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(obj, property);
};


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
   * @param {Buffer} message message to be sent
   * @param {String} queue queue or topic where to send the message
   * @param {String} [exchange = ''] exchage to be used if topics are used
   * @param {Object} [options = {}] message options to be used when sending message
   * @returns {Promise} resolves on success
   * @public
   */
  sendMessage({ message, queue, exchange = '', options = {} }) {
    return this.parsePublishOptions(options)
      .then(amqpOptions => this.sendMessageToMQ(exchange, queue, message, amqpOptions))

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

  /**
   *
   * Internal method to be used when sending messages to RabbitMQ
   * @param {Buffer} message message to be sent
   * @param {String} queue queue or topic where to send the message
   * @param {String} exchange = '' exchage to be used if topics are used
   * @param {Object} options = {} message options to be used when sending message
   * @returns {Promise} resolves on success
   * @private
   */
  sendMessageToMQ({ message, queue, exchange, options }) {
    return this.publishChannel.publish(exchange, queue, message, options)
      .then((publishResult) => {
        if (publishResult) {
          this.debug(`Success sending message on exchange "${exchange}" queue "${queue}"`);
          return Promise.resolve();
        }
        this.debug(`Error sending message on exchange "${exchange}" queue "${queue}", buffer full`);
        return this.rejectWithError({
          name:     'MQ_PUBLISH_MESSAGE_ERROR',
          source:   `${this.sourceIdentifier}.publishMessage`,
          message:  'Buffer full',
          severity: 'WARNING',
        });
      });
  }

  /**
   * parse generic options into amqp specific options
   * @param {Object} options generic publish message options
   * @returns {Promise} resolves with amqplib options
   */
  parsePublishOptions(options) { // eslint-disable-line class-methods-use-this
    const amqpOptions = {};
    if (has(options, 'ttl')) {
      amqpOptions.expiration = `${options.ttl}000`;
    }
    return Promise.resolve(amqpOptions);
  }

}

module.exports = {
  RabbitMQ,
};
