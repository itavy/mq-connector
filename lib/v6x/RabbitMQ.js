'use strict';

const { assert, has } = require('./Helpers');


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
      value:        di.rejectWithError,
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

    Reflect.defineProperty(this, 'subscribeChannel', {
      configurable: false,
      enumerable:   false,
      writable:     true,
      value:        null,
    });

    Reflect.defineProperty(this, 'subscribeQueueOptions', {
      configurable: false,
      enumerable:   false,
      writable:     false,
      value:        {
        exclusive:  false,
        durable:    true,
        autoDelete: true,
      },
    });

    Reflect.defineProperty(this, 'mqURI', {
      configurable: false,
      enumerable:   false,
      writable:     false,
      value:        di.mqURI,
    });

    Reflect.defineProperty(this, 'amqplib', {
      configurable: false,
      enumerable:   false,
      writable:     false,
      value:        di.amqplib,
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
      .then((pchannel) => {
        this.debug('Successful created publish channel');
        this.publishChannel = pchannel;
        return this.connection.createConfirmChannel();
      })
      .then((schannel) => {
        this.debug('Successful created subscribe channel');
        this.subscribeChannel = schannel;
        return Promise.resolve();
      })
      .catch((conectError) => {
        const errMsg = `Error connecting to MQ broker: ${conectError.message}`;
        this.debug(errMsg);
        return this.rejectWithError({
          name:     'MQ_CONNECT_ERROR',
          source:   `${this.sourceIdentifier}.connect`,
          message:  errMsg,
          severity: 'FATAL',
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
        const errMsg = `Error sending message: ${sendMessageError.message}`;
        this.debug(errMsg);
        return this.rejectWithError({
          name:     'MQ_SEND_MESSAGE_ERROR',
          source:   `${this.sourceIdentifier}.sendMessage`,
          message:  errMsg,
          severity: 'WARNING',
          cause:    sendMessageError,
        });
      });
  }

  /**
   * Subscribe to a queue or topic
   * @param {String} [queue = null] queue where to subscribe
   * @param {Function} consumer function to be called when there are messages to be received
   * @param {String} [exchange = null] exchange to be used when topics are used
   * @param {String} [topic = null] topic where the queue is binded
   * @param {Object} [options = null] options for subscription
   * @returns {Promise} resolves on success
   * @public
   */
  subscribe({ consumer, queue = null, exchange = null, topic = null, options = {} }) {
    return this.parseSubscribeOptions({ queue, exchange, topic, options })
      .then(parseResult => this.subscribeToQueue(Object.assign({}, parseResult, { consumer })))

      .catch((subscribeError) => {
        const errMsg = `Error subscribing to queue "${queue}", exchange "${exchange}, topic "${topic}": ${subscribeError.message}`;
        this.debug(errMsg);
        return this.rejectWithError({
          name:     'MQ_SUBSCRIBE_ERROR',
          source:   `${this.sourceIdentifier}.subscribe`,
          message:  errMsg,
          severity: subscribeError.severity === 'FATAL' ? subscribeError.severity : 'WARNING',
          cause:    subscribeError,
        });
      });
  }


  /**
   * Internal method to use for setting up subscription
   * @param {String} [queue = null] queue where to subscribe
   * @param {String} [exchange = null] exchange to be used when topics are used
   * @param {String} [topic = null] topic where the queue is binded
   * @param {Object} [options = null] options for subscription
   * @returns {Promise} resolves on success
   * @private
   */
  parseSubscribeOptions({ queue, exchange, topic, options }) {
    return new Promise((resolve) => {
      // either queue or exchange and topic must be defined
      assert(queue || (exchange && topic), 'Missing required arguments');
      const subscribeOptions = {
        prefetch: false,
      };
      if (has(options, 'prefetch')) {
        subscribeOptions.prefetch = options.prefetch;
      }
      return resolve(subscribeOptions);
    })
      .then(subscribeOptions => Promise.all([
        subscribeOptions,
        this.checkQueue({ queue, exchange, topic }),
      ]))
      .then(resolvedQueue => Promise.resolve({
        queue:   resolvedQueue[1].queue,
        options: resolvedQueue[0],
      }))

      .catch((parseError) => {
        const errMsg = `Error parsing subscribe options; severity ${parseError.severity}; message: ${parseError.message}`;
        this.debug(errMsg);
        return this.rejectWithError({
          name:     'MQ_PARSE_SUBSCRIBE_OPTIONS_ERROR',
          source:   `${this.sourceIdentifier}.parseSubscribeOptions`,
          message:  errMsg,
          severity: parseError.severity === 'FATAL' ? parseError.severity : 'WARNING',
          cause:    parseError,
        });
      });
  }

  /**
   * Internal method to use for checking queue subscription
   * @param {String} [queue = null] queue where to subscribe
   * @param {String} [exchange = null] exchange to be used when topics are used
   * @param {String} [topic = null] topic where the queue is binded
   * @returns {Promise} resolves with queueName on success
   * @private
   */
  checkQueue({ queue, exchange, topic }) {
    return this.subscribeChannel.assertQueue(queue, this.subscribeQueueOptions)
      .then(assertedQueue => this.bindQueue({
        queue: assertedQueue.queue,
        exchange,
        topic,
      }))
      .then(bindResponse => Promise.resolve({
        queue: bindResponse.queue,
      }))

      .catch((checkQueueError) => {
        const errMsg = `Error checking checkQueue; severity: ${checkQueueError.severity}; message: ${checkQueueError.message}`;
        this.debug(errMsg);
        return this.rejectWithError({
          name:     'MQ_CHECK_QUEUE_ERROR',
          source:   `${this.sourceIdentifier}.checkQueue`,
          message:  errMsg,
          severity: checkQueueError.severity === 'FATAL' ? checkQueueError.severity : 'WARNING',
          cause:    checkQueueError,
        });
      });
  }

  /**
   * Internal method to use for binding a queue to a topic
   * @param {String} [queue = null] queue where to subscribe
   * @param {String} [exchange = null] exchange to be used when topics are used
   * @param {String} [topic = null] topic where the queue is binded
   * @returns {Promise} resolves with queueName on success
   * @private
   */
  bindQueue({ queue, exchange, topic }) {
    if (exchange === '') {
      return Promise.resolve({ queue });
    }
    return this.checkExchange({
      channel: this.subscribeChannel,
      exchange,
    })
      .then(() => this.subscribeChannel.bindQueue(queue, exchange, topic)
        .catch((errorBinding) => {
          const errMsg = `Error binding queue "${queue}" to topic "${topic}" on exchange "${exchange}"; severity: ${errorBinding.severity}; message:  ${errorBinding.message}`;
          this.debug(errMsg);
          return this.rejectWithError({
            name:     'MQ_BIND_QUEUE_ERROR',
            source:   `${this.sourceIdentifier}.bindQueue`,
            message:  errMsg,
            severity: 'WARNING',
            cause:    errorBinding,
          });
        }))
      .then(() => Promise.resolve({ queue }));
  }

  /**
   * Internal method to use for registering a consumer to a queue
   * @param {String} queue queue where to subscribe
   * @param {Function} consumer  consumer to be called when there is a message on the queue
   * @param {Object} options subscribing options
   * @returns {Promise} resolves with queueName on success
   * @private
   */
  subscribeToQueue({ queue, consumer, options }) {
    return new Promise((resolve) => {
      this.subscribeChannel.prefetch(options.prefetch);
      // @todo investigate replacement of function with promise for consumer
      this.subscribeChannel.consume(queue, qMessage => consumer({
        message:  qMessage.content,
        topic:    qMessage.fields.routingKey,
        exchange: qMessage.fields.exchange,
        ack:      () => this.ackMessage(qMessage),
        queue,
      }))
        .then(() => resolve({ queue }));
    })
      .catch((errorSubscribing) => {
        const errMsg = `Error subscribing to queue "${queue}": ${errorSubscribing.message}`;
        this.debug(errMsg);
        return this.rejectWithError({
          name:     'MQ_SUBSCRIBE_ERROR',
          source:   `${this.sourceIdentifier}.subscribeToQueue`,
          message:  errMsg,
          severity: 'WARNING',
          cause:    errorSubscribing,
        });
      });
  }

  /**
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
        const errMsg = `Error sending message on exchange "${exchange}" queue "${queue}", buffer full`;
        this.debug(errMsg);
        return this.rejectWithError({
          name:     'MQ_PUBLISH_MESSAGE_ERROR',
          source:   `${this.sourceIdentifier}.publishMessage`,
          message:  errMsg,
          severity: 'WARNING',
        });
      });
  }

  /**
   * parse generic options into amqp specific options
   * @param {Object} options generic publish message options
   * @returns {Promise} resolves with amqplib options
   * @private
   */
  parsePublishOptions(options) { // eslint-disable-line class-methods-use-this
    const amqpOptions = {};
    if (has(options, 'ttl')) {
      amqpOptions.expiration = `${options.ttl}000`;
    }
    return Promise.resolve(amqpOptions);
  }

  /**
   * Checks if requested exchange is defined
   * @param {String} exchange exchange name
   * @param {Object} channel channel to be used for check
   * @returns {Promise} resolves on success
   */
  checkExchange({ exchange, channel }) {
    return channel.checkExchange(exchange)
      .catch((checkExchangeError) => {
        const errMsg = `Error checking exchange "${exchange}": ${checkExchangeError.message}`;
        this.debug(errMsg);
        // channel will be closed
        return this.rejectWithError({
          name:     'MQ_CHECK_EXCHANGE_ERROR',
          source:   `${this.sourceIdentifier}.checkExchange`,
          message:  errMsg,
          severity: 'FATAL',
          cause:    checkExchangeError,
        });
      });
  }
}

module.exports = {
  RabbitMQ,
};
