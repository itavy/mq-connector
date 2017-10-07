'use strict';

const { assert, has } = require('./Helpers');
const { EventEmitter } = require('events');

/**
 * Rabbit MQ interface
 */
class RabbitMQ {
  /**
   * @param {Object} di required dependencies for RabbitMq interface
   */
  constructor({ debug,
                sourceIdentifier,
                rejectWithError,
                mqURI,
                amqplib,
                promiseOnEvent,
                publish = true,
                subscribe = true }) {
    Reflect.defineProperty(this, 'debug', {
      configurable: false,
      enumerable:   true,
      writable:     false,
      value:        debug,
    });

    Reflect.defineProperty(this, 'sourceIdentifier', {
      configurable: false,
      enumerable:   false,
      writable:     false,
      value:        `${sourceIdentifier}.RabbitMQ`,
    });

    Reflect.defineProperty(this, 'rejectWithError', {
      configurable: false,
      enumerable:   false,
      writable:     false,
      value:        rejectWithError,
    });

    Reflect.defineProperty(this, 'connectionFlags', {
      configurable: false,
      enumerable:   false,
      writable:     true,
      value:        {
        connecting: false,
        creatingPC: false,
        creatingSC: false,
        closing:    false,
        closingPC:  false,
        closingSC:  false,
        publish,
        subscribe,
      },
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
        autoDelete: false,
      },
    });

    Reflect.defineProperty(this, 'mqURI', {
      configurable: false,
      enumerable:   false,
      writable:     false,
      value:        mqURI,
    });

    Reflect.defineProperty(this, 'amqplib', {
      configurable: false,
      enumerable:   false,
      writable:     false,
      value:        amqplib,
    });

    Reflect.defineProperty(this, 'rmqEvents', {
      configurable: false,
      enumerable:   false,
      writable:     false,
      value:        Reflect.construct(EventEmitter, []),
    });

    Reflect.defineProperty(this, 'promiseOnEvent', {
      configurable: false,
      enumerable:   false,
      writable:     false,
      value:        promiseOnEvent,
    });
  }

  /**
   * Close connection to message broker
   * @returns {Promise} resolves on succeeded connection
   * @public
   */
  close() {
    if (this.connection === null) {
      return Promise.resolve();
    }
    if (!this.connectionFlags.closing) {
      this.connectionFlags.closing = true;
      return this.closeChannel({
        name:  'publishChannel',
        flag:  'closingPC',
        event: 'closePublish',
      })
        .then(() => this.closeChannel({
          name:  'subscribeChannel',
          flag:  'closingSC',
          event: 'closeSubscribe',
        }))
        .then(() => this.connection.close())
        .then(() => {
          this.connection = null;
          this.connectionFlags.closing = false;
          this.rmqEvents.emit('closeConnection');
          return Promise.resolve();
        });
    }
    return this.promiseOnEvent(this.rmqEvents, 'closeConnection');
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
      .then(amqpOptions => this.getPublishChannel()
        .then(ch => this.sendMessageToMQ({
          options: amqpOptions,
          exchange,
          queue,
          message,
          ch,
        })))

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
  subscribe({ consumer, queue = '', exchange = '', topic = '', options = {} }) {
    return this.getSubscribeChannel()
      .then(ch => this.parseSubscribeOptions({ queue, exchange, topic, options, ch })
        .then(parseResult => this.subscribeToQueue(Object.assign({}, parseResult, {
          consumer,
          ch,
        }))))

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
   * @param {Object} ch queue channel
   * @returns {Promise} resolves on success
   * @private
   */
  parseSubscribeOptions({ queue, exchange, topic, options, ch }) {
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
        this.checkQueue({ queue, exchange, topic, ch }),
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
   * @param {Object} ch queue channel
   * @returns {Promise} resolves with queueName on success
   * @private
   */
  checkQueue({ queue, exchange, topic, ch }) {
    let subscribeOptions;
    if (queue === '') {
      subscribeOptions = {
        exclusive:  true,
        durable:    false,
        autoDelete: true,
      };
    } else {
      subscribeOptions = this.subscribeQueueOptions;
    }
    // return ch.assertQueue(queue, this.subscribeQueueOptions)
    return ch.assertQueue(queue, subscribeOptions)
      .then(assertedQueue => this.bindQueue({
        queue: assertedQueue.queue,
        exchange,
        topic,
        ch,
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
  bindQueue({ queue, exchange, topic, ch }) {
    return this.checkExchange({
      channel: ch,
      exchange,
    })
      .then(() => {
        if (exchange === '') {
          return Promise.resolve();
        }
        return ch.bindQueue(queue, exchange, topic)
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
          });
      })
      .then(() => Promise.resolve({ queue }));
  }

  /**
   * Internal method to use for registering a consumer to a queue
   * @param {String} queue queue where to subscribe
   * @param {Function} consumer  consumer to be called when there is a message on the queue
   * @param {Object} options subscribing options
   * @param {Object} ch queue channel
   * @returns {Promise} resolves with queueName on success
   * @private
   */
  subscribeToQueue({ queue, consumer, options, ch }) {
    return new Promise((resolve) => {
      ch.prefetch(options.prefetch);
      // @todo investigate replacement of function with promise for consumer
      return ch.consume(queue, qMessage => consumer({
        ack: /* istanbul ignore next */ () => new Promise((resolveAck) => {
          this.debug(`Ack message: ${qMessage.fields.consumerTag}`);
          ch.ack(qMessage);
          return resolveAck();
        }),
        message:  qMessage.content,
        topic:    qMessage.fields.routingKey,
        exchange: qMessage.fields.exchange,
        queue,
      }), { noAck: false })
        .then(() => resolve({
          queue,
        }));
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
   * @param {Object} ch chanel on which will be sent messages
   * @returns {Promise} resolves on success
   * @private
   */
  sendMessageToMQ({ message, queue, exchange, options, ch }) {
    return new Promise((resolve, reject) => {
      const publishResult = ch.publish(exchange, queue, message, options);
      if (publishResult) {
        this.debug(`Success sending message on exchange "${exchange}" queue "${queue}"`);
        return resolve();
      }
      const errMsg = `Error sending message on exchange "${exchange}" queue "${queue}", buffer full`;
      this.debug(errMsg);
      return reject(errMsg);
    })
      .catch(err => this.rejectWithError({
        name:     'MQ_PUBLISH_MESSAGE_ERROR',
        source:   `${this.sourceIdentifier}.publishMessage`,
        message:  err.message,
        severity: 'WARNING',
      }));
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
   * @private
   */
  checkExchange({ exchange, channel }) {
    if (exchange === '') {
      return Promise.resolve();
    }
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

  /**
   * Get RabbitMQ connection
   * @returns {Promise} resolves with connection on success
   * @private
   */
  getConnection() {
    if (this.connection) {
      return Promise.resolve(this.connection);
    }
    if (this.connectionFlags.connecting) {
      return this.promiseOnEvent(this.rmqEvents, 'createdConnection')
        .then(() => Promise.resolve(this.connection));
    }
    this.connectionFlags.connecting = true;
    return this.amqplib.connect(this.mqURI)
      .then((connection) => {
        this.debug(`Successful connected to ${this.mqURI}`);
        this.connection = connection;
        this.connectionFlags.connecting = false;

        this.rmqEvents.emit('createdConnection');
        return Promise.resolve(this.connection);
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
   * Create channel
   * @returns {Promise} resolves with publish channel;
   * @private
   */
  createChannel({ name, flag, event }) {
    this.connectionFlags[flag] = true;
    return this.getConnection()
      .then(connection => connection.createConfirmChannel())
      .then((channel) => {
        this.debug(`Successful created ${name} channel`);
        this[name] = channel;
        this.rmqEvents.emit(event);
        this.connectionFlags[flag] = false;
        return Promise.resolve(channel);
      })
      .catch((chError) => {
        const errMsg = `Error creating ${name} channel: ${chError.message}`;
        this.debug(errMsg);
        return this.rejectWithError({
          name:     'MQ_CHANNEL_ERROR',
          source:   `${this.sourceIdentifier}.createChannel`,
          message:  errMsg,
          severity: 'FATAL',
          cause:    chError,
        });
      });
  }

  /**
   * Get publish channel
   * @returns {Promise} resolves with publish channel;
   * @private
   */
  getPublishChannel() {
    return new Promise((resolve, reject) => {
      if (this.connectionFlags.publish) {
        if (this.publishChannel) {
          return resolve(this.publishChannel);
        }
        if (this.connectionFlags.creatingPC) {
          return this.promiseOnEvent(this.rmqEvents, 'createdPublishChannel')
            .then(channel => resolve(channel));
        }
        return this.createChannel({
          name:  'publishChannel',
          flag:  'creatingPC',
          event: 'createdPublishChannel',
        })
          .then(channel => resolve(channel))
          .catch(chError => reject(chError));
      }
      return reject(Error('Publish not allowed'));
    })
      .catch((chError) => {
        const errMsg = `Error getting publish channel: ${chError.message}`;
        this.debug(errMsg);
        return this.rejectWithError({
          name:     'MQ_PUBLISH_CHANNEL_ERROR',
          source:   `${this.sourceIdentifier}.getPublishChannel`,
          message:  errMsg,
          severity: 'FATAL',
          cause:    chError,
        });
      });
  }

  /**
   * Get publish channel
   * @returns {Promise} resolves with publish channel;
   * @private
   */
  getSubscribeChannel() {
    return new Promise((resolve, reject) => {
      if (this.connectionFlags.subscribe) {
        if (this.subscribeChannel) {
          return resolve(this.subscribeChannel);
        }
        if (this.connectionFlags.creatingSC) {
          return this.promiseOnEvent(this.rmqEvents, 'createdSubscribeChannel')
            .then(channel => resolve(channel));
        }
        return this.createChannel({
          name:  'subscribeChannel',
          flag:  'creatingSC',
          event: 'createdSubscribeChannel',
        })
          .then(channel => resolve(channel))
          .catch(chError => reject(chError));
      }
      return reject(Error('Subscribe not allowed'));
    })
      .catch((chError) => {
        const errMsg = `Error getting subscribe channel: ${chError.message}`;
        this.debug(errMsg);
        return this.rejectWithError({
          name:     'MQ_SUBSCRIBE_CHANNEL_ERROR',
          source:   `${this.sourceIdentifier}.getSubscribeChannel`,
          message:  errMsg,
          severity: 'FATAL',
          cause:    chError,
        });
      });
  }

  /**
   * Close a channel
   * @param {String} name channel name
   * @param {String} flag flag name for channel status
   * @param {String} event event name for signalling when channel is closed
   * @returns {Promise} resolves on success
   * @private
   */
  closeChannel({ name, flag, event }) {
    if (this[name] === null) {
      return Promise.resolve();
    }
    if (!this.connectionFlags[flag]) {
      this.connectionFlags[flag] = true;
      return this[name].waitForConfirms()
        .then(() => this[name].close())
        .then(() => {
          this[name] = null;
          this.connectionFlags[flag] = false;
          this.rmqEvents.emit(event);
          return Promise.resolve();
        });
    }
    return this.promiseOnEvent(this.rmqEvents, event);
  }
}

module.exports = {
  RabbitMQ,
};
