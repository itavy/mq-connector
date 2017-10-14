'use strict';

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const assert = require('assert');

var _require = require('events');

const EventEmitter = _require.EventEmitter;

/**
 * Rabbit MQ interface
 */

class RabbitMQ {
  /**
   * @param {Object} di required dependencies for RabbitMq interface
   */
  constructor({
    debug,
    sourceIdentifier,
    rejectWithError,
    mqURI,
    amqplib,
    promiseOnEvent,
    publish = true,
    subscribe = true
  }) {
    Reflect.defineProperty(this, 'debug', {
      configurable: false,
      enumerable: true,
      writable: false,
      value: debug
    });

    Reflect.defineProperty(this, 'sourceIdentifier', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: `${sourceIdentifier}.RabbitMQ`
    });

    Reflect.defineProperty(this, 'rejectWithError', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: rejectWithError
    });

    Reflect.defineProperty(this, 'connectionFlags', {
      configurable: false,
      enumerable: false,
      writable: true,
      value: {
        connecting: false,
        creatingPC: false,
        creatingSC: false,
        closing: false,
        closingPC: false,
        closingSC: false,
        publish,
        subscribe
      }
    });

    Reflect.defineProperty(this, 'connection', {
      configurable: true,
      enumerable: false,
      writable: true,
      value: null
    });

    Reflect.defineProperty(this, 'publishChannel', {
      configurable: true,
      enumerable: false,
      writable: true,
      value: null
    });

    Reflect.defineProperty(this, 'subscribeChannel', {
      configurable: false,
      enumerable: false,
      writable: true,
      value: null
    });

    Reflect.defineProperty(this, 'subscribeQueueOptions', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: {
        exclusive: false,
        durable: true,
        autoDelete: false
      }
    });

    Reflect.defineProperty(this, 'mqURI', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: mqURI
    });

    Reflect.defineProperty(this, 'amqplib', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: amqplib
    });

    Reflect.defineProperty(this, 'rmqEvents', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: Reflect.construct(EventEmitter, [])
    });

    Reflect.defineProperty(this, 'promiseOnEvent', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: promiseOnEvent
    });
  }

  /**
   * Close connection to message broker
   * @returns {Promise} resolves on succeeded connection
   * @public
   */
  close() {
    var _this = this;

    return _asyncToGenerator(function* () {
      if (_this.connection === null) {
        return true;
      }
      if (!_this.connectionFlags.closing) {
        _this.connectionFlags.closing = true;

        yield _this.closeChannel({
          name: 'publishChannel',
          flag: 'closingPC',
          event: 'closePublish'
        });

        yield _this.closeChannel({
          name: 'subscribeChannel',
          flag: 'closingSC',
          event: 'closeSubscribe'
        });

        yield _this.connection.close();

        _this.connection = null;
        _this.connectionFlags.closing = false;
        _this.rmqEvents.emit('closeConnection');

        return true;
      }
      return _this.promiseOnEvent(_this.rmqEvents, 'closeConnection');
    })();
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
  sendMessage({
    message, queue, exchange = '', options = {}
  }) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      try {
        const amqpOptions = yield _this2.parsePublishOptions(options);
        const ch = yield _this2.getPublishChannel();
        return _this2.sendMessageToMQ({
          options: amqpOptions,
          exchange,
          queue,
          message,
          ch
        });
      } catch (sendMessageError) {
        const errMsg = `Error sending message: ${sendMessageError.message}`;
        _this2.debug(errMsg);
        return _this2.rejectWithError({
          name: 'MQ_SEND_MESSAGE_ERROR',
          source: `${_this2.sourceIdentifier}.sendMessage`,
          message: errMsg,
          severity: 'WARNING',
          cause: sendMessageError
        });
      }
    })();
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
  subscribe({
    consumer, queue = '', exchange = '', topic = '', options = {}
  }) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      try {
        const ch = yield _this3.getSubscribeChannel();
        const parseResult = yield _this3.parseSubscribeOptions({
          queue, exchange, topic, options, ch
        });

        return _this3.subscribeToQueue(Object.assign({}, parseResult, {
          consumer,
          ch
        }));
      } catch (subscribeError) {
        const errMsg = `Error subscribing to queue "${queue}", exchange "${exchange}, topic "${topic}": ${subscribeError.message}`;
        _this3.debug(errMsg);
        return _this3.rejectWithError({
          name: 'MQ_SUBSCRIBE_ERROR',
          source: `${_this3.sourceIdentifier}.subscribe`,
          message: errMsg,
          severity: subscribeError.severity === 'FATAL' ? subscribeError.severity : 'WARNING',
          cause: subscribeError
        });
      }
    })();
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
  parseSubscribeOptions({
    queue, exchange, topic, ch, options = {}
  }) {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      try {
        // either queue or exchange and topic must be defined
        assert(queue || exchange && topic, 'Missing required arguments');
        var _options$prefetch = options.prefetch;

        const prefetch = _options$prefetch === undefined ? false : _options$prefetch,
              rOptions = _objectWithoutProperties(options, ['prefetch']);

        const computedSubscribeOptions = Object.assign({}, { prefetch }, rOptions);

        var _ref = yield _this4.checkQueue({
          queue, exchange, topic, ch
        });

        const subscribedQueue = _ref.queue;


        return {
          queue: subscribedQueue,
          options: computedSubscribeOptions
        };
      } catch (parseError) {
        const errMsg = `Error parsing subscribe options; severity ${parseError.severity}; message: ${parseError.message}`;
        _this4.debug(errMsg);
        return _this4.rejectWithError({
          name: 'MQ_PARSE_SUBSCRIBE_OPTIONS_ERROR',
          source: `${_this4.sourceIdentifier}.parseSubscribeOptions`,
          message: errMsg,
          severity: parseError.severity === 'FATAL' ? parseError.severity : 'WARNING',
          cause: parseError
        });
      }
    })();
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
  checkQueue({
    queue, exchange, topic, ch
  }) {
    var _this5 = this;

    return _asyncToGenerator(function* () {
      try {
        let subscribeOptions;
        if (queue === '') {
          subscribeOptions = {
            exclusive: true,
            durable: false,
            autoDelete: true
          };
        } else {
          subscribeOptions = _this5.subscribeQueueOptions;
        }

        var _ref2 = yield ch.assertQueue(queue, subscribeOptions);

        const assertedQueue = _ref2.queue;


        yield _this5.bindQueue({
          queue: assertedQueue,
          exchange,
          topic,
          ch
        });
        return {
          queue: assertedQueue
        };
      } catch (checkQueueError) {
        const errMsg = `Error checking checkQueue; severity: ${checkQueueError.severity}; message: ${checkQueueError.message}`;
        _this5.debug(errMsg);
        return _this5.rejectWithError({
          name: 'MQ_CHECK_QUEUE_ERROR',
          source: `${_this5.sourceIdentifier}.checkQueue`,
          message: errMsg,
          severity: checkQueueError.severity === 'FATAL' ? checkQueueError.severity : 'WARNING',
          cause: checkQueueError
        });
      }
    })();
  }

  /**
   * Internal method to use for binding a queue to a topic
   * @param {String} queue queue where to subscribe
   * @param {String} [exchange = null] exchange to be used when topics are used
   * @param {String} [topic = null] topic where the queue is binded
   * @param {Object} ch queue channel
   * @returns {Promise} resolves with queueName on success
   * @private
   */
  bindQueue({
    queue, exchange, topic, ch
  }) {
    var _this6 = this;

    return _asyncToGenerator(function* () {
      yield _this6.checkExchange({
        channel: ch,
        exchange
      });
      if (exchange === '') {
        return true;
      }
      yield ch.bindQueue(queue, exchange, topic).catch(function (errorBinding) {
        const errMsg = `Error binding queue "${queue}" to topic "${topic}" on exchange "${exchange}"; severity: ${errorBinding.severity}; message:  ${errorBinding.message}`;
        _this6.debug(errMsg);
        return _this6.rejectWithError({
          name: 'MQ_BIND_QUEUE_ERROR',
          source: `${_this6.sourceIdentifier}.bindQueue`,
          message: errMsg,
          severity: 'WARNING',
          cause: errorBinding
        });
      });
      return true;
    })();
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
  subscribeToQueue({
    queue, consumer, options, ch
  }) {
    var _this7 = this;

    return _asyncToGenerator(function* () {
      // istanbul ignore next
      // eslint-disable-next-line require-jsdoc
      const localConsumer = (() => {
        var _ref3 = _asyncToGenerator(function* (qMessage) {
          try {
            yield consumer({
              nack: (() => {
                var _ref4 = _asyncToGenerator(function* () {
                  _this7.debug(`NAck message: ${qMessage.fields.consumerTag}`);
                  yield ch.nack(qMessage);
                  return true;
                });

                return function nack() {
                  return _ref4.apply(this, arguments);
                };
              })(),
              message: qMessage.content,
              topic: qMessage.fields.routingKey,
              exchange: qMessage.fields.exchange,
              consumerTag: qMessage.fields.consumerTag,
              queue
            });

            _this7.debug(`Ack message: ${qMessage.fields.consumerTag}`);
            yield ch.ack(qMessage);
            return true;
          } catch (error) {
            _this7.debug(`Error processing message ${qMessage.fields.consumerTag}: ${error.message}`);
            yield ch.ack(qMessage);
            return true;
          }
        });

        return function localConsumer(_x) {
          return _ref3.apply(this, arguments);
        };
      })();

      try {
        ch.prefetch(options.prefetch);

        var _ref5 = yield ch.consume(queue, localConsumer, { noAck: false });

        const consumerTag = _ref5.consumerTag;

        return {
          subscribeId: consumerTag,
          queue
        };
      } catch (errorSubscribing) {
        const errMsg = `Error subscribing to queue "${queue}": ${errorSubscribing.message}`;
        _this7.debug(errMsg);
        return _this7.rejectWithError({
          name: 'MQ_SUBSCRIBE_ERROR',
          source: `${_this7.sourceIdentifier}.subscribeToQueue`,
          message: errMsg,
          severity: 'WARNING',
          cause: errorSubscribing
        });
      }
    })();
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
  sendMessageToMQ({
    message, queue, exchange, options, ch
  }) {
    var _this8 = this;

    return _asyncToGenerator(function* () {
      try {
        const publishResult = ch.publish(exchange, queue, message, options);
        if (publishResult) {
          _this8.debug(`Success sending message on exchange "${exchange}" queue "${queue}"`);
          return true;
        }
        const errMsg = `Error sending message on exchange "${exchange}" queue "${queue}", buffer full`;
        _this8.debug(errMsg);
        throw Error(errMsg);
      } catch (err) {
        return _this8.rejectWithError({
          name: 'MQ_PUBLISH_MESSAGE_ERROR',
          source: `${_this8.sourceIdentifier}.publishMessage`,
          message: err.message,
          severity: 'WARNING'
        });
      }
    })();
  }

  /**
   * parse generic options into amqp specific options
   * @param {Number} number of seconds untill message will expire
   * @returns {Promise} resolves with amqplib options
   * @private
   */
  parsePublishOptions({ ttl = false }) {
    return _asyncToGenerator(function* () {
      // eslint-disable-line class-methods-use-this
      const amqpOptions = {};
      if (ttl) {
        amqpOptions.expiration = `${ttl}000`;
      }
      return amqpOptions;
    })();
  }

  /**
   * Checks if requested exchange is defined
   * @param {String} exchange exchange name
   * @param {Object} channel channel to be used for check
   * @returns {Promise} resolves on success
   * @private
   */
  checkExchange({ exchange, channel }) {
    var _this9 = this;

    return _asyncToGenerator(function* () {
      if (exchange === '') {
        return true;
      }
      try {
        yield channel.checkExchange(exchange);
        return true;
      } catch (checkExchangeError) {
        const errMsg = `Error checking exchange "${exchange}": ${checkExchangeError.message}`;
        _this9.debug(errMsg);
        // channel will be closed
        return _this9.rejectWithError({
          name: 'MQ_CHECK_EXCHANGE_ERROR',
          source: `${_this9.sourceIdentifier}.checkExchange`,
          message: errMsg,
          severity: 'FATAL',
          cause: checkExchangeError
        });
      }
    })();
  }

  /**
   * Get RabbitMQ connection
   * @returns {Promise} resolves with connection on success
   * @private
   */
  getConnection() {
    var _this10 = this;

    return _asyncToGenerator(function* () {
      if (_this10.connection) {
        return _this10.connection;
      }
      if (_this10.connectionFlags.connecting) {
        yield _this10.promiseOnEvent(_this10.rmqEvents, 'createdConnection');
        return _this10.connection;
      }
      _this10.connectionFlags.connecting = true;
      try {
        _this10.connection = yield _this10.amqplib.connect(_this10.mqURI);
        _this10.connectionFlags.connecting = false;
        _this10.debug(`Successful connected to ${_this10.mqURI}`);
        _this10.rmqEvents.emit('createdConnection');
        return _this10.connection;
      } catch (connectError) {
        const errMsg = `Error connecting to MQ broker: ${connectError.message}`;
        _this10.debug(errMsg);
        return _this10.rejectWithError({
          name: 'MQ_CONNECT_ERROR',
          source: `${_this10.sourceIdentifier}.connect`,
          message: errMsg,
          severity: 'FATAL',
          cause: connectError
        });
      }
    })();
  }

  /**
   * Create channel
   * @returns {Promise} resolves with publish channel;
   * @private
   */
  createChannel({ name, flag, event }) {
    var _this11 = this;

    return _asyncToGenerator(function* () {
      _this11.connectionFlags[flag] = true;
      try {
        const connection = yield _this11.getConnection();
        _this11[name] = yield connection.createConfirmChannel();
        _this11.debug(`Successful created ${name} channel`);
        _this11.rmqEvents.emit(event);
        _this11.connectionFlags[flag] = false;
        return _this11[name];
      } catch (chError) {
        const errMsg = `Error creating ${name} channel: ${chError.message}`;
        _this11.debug(errMsg);
        return _this11.rejectWithError({
          name: 'MQ_CHANNEL_ERROR',
          source: `${_this11.sourceIdentifier}.createChannel`,
          message: errMsg,
          severity: 'FATAL',
          cause: chError
        });
      }
    })();
  }

  /**
   * Get publish channel
   * @returns {Promise} resolves with publish channel;
   * @private
   */
  getPublishChannel() {
    var _this12 = this;

    return _asyncToGenerator(function* () {
      try {
        if (_this12.connectionFlags.publish) {
          if (_this12.publishChannel) {
            return _this12.publishChannel;
          }
          if (_this12.connectionFlags.creatingPC) {
            yield _this12.promiseOnEvent(_this12.rmqEvents, 'createdPublishChannel');
            return _this12.publishChannel;
          }
          yield _this12.createChannel({
            name: 'publishChannel',
            flag: 'creatingPC',
            event: 'createdPublishChannel'
          });
          return _this12.publishChannel;
        }
        throw Error('Publish not allowed');
      } catch (chError) {
        const errMsg = `Error getting publish channel: ${chError.message}`;
        _this12.debug(errMsg);
        return _this12.rejectWithError({
          name: 'MQ_PUBLISH_CHANNEL_ERROR',
          source: `${_this12.sourceIdentifier}.getPublishChannel`,
          message: errMsg,
          severity: 'FATAL',
          cause: chError
        });
      }
    })();
  }

  /**
   * Get Subscribe channel
   * @returns {Promise} resolves with subscribe channel;
   * @private
   */
  getSubscribeChannel() {
    var _this13 = this;

    return _asyncToGenerator(function* () {
      try {
        if (_this13.connectionFlags.subscribe) {
          if (_this13.subscribeChannel) {
            return _this13.subscribeChannel;
          }
          if (_this13.connectionFlags.creatingSC) {
            yield _this13.promiseOnEvent(_this13.rmqEvents, 'createdSubscribeChannel');
            return _this13.subscribeChannel;
          }
          yield _this13.createChannel({
            name: 'subscribeChannel',
            flag: 'creatingSC',
            event: 'createdSubscribeChannel'
          });
          return _this13.subscribeChannel;
        }
        throw Error('Subscribe not allowed');
      } catch (chError) {
        const errMsg = `Error getting subscribe channel: ${chError.message}`;
        _this13.debug(errMsg);
        return _this13.rejectWithError({
          name: 'MQ_SUBSCRIBE_CHANNEL_ERROR',
          source: `${_this13.sourceIdentifier}.getSubscribeChannel`,
          message: errMsg,
          severity: 'FATAL',
          cause: chError
        });
      }
    })();
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
    var _this14 = this;

    return _asyncToGenerator(function* () {
      if (_this14[name] === null) {
        return Promise.resolve();
      }
      if (!_this14.connectionFlags[flag]) {
        _this14.connectionFlags[flag] = true;
        yield _this14[name].waitForConfirms();
        yield _this14[name].close();
        _this14[name] = null;
        _this14.connectionFlags[flag] = false;
        _this14.rmqEvents.emit(event);
        return true;
      }
      return _this14.promiseOnEvent(_this14.rmqEvents, event);
    })();
  }
}

module.exports = {
  RabbitMQ
};