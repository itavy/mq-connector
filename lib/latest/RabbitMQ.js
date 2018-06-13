'use strict';

const assert = require('assert');
const { EventEmitter } = require('events');
const { IError } = require('@itavy/ierror');

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
    mqURI,
    amqplib,
    promiseOnEvent,
    publish = true,
    subscribe = true,
  }) {
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
  async close() {
    if (this.connection === null) {
      return true;
    }
    if (!this.connectionFlags.closing) {
      this.connectionFlags.closing = true;

      await this.closeChannel({
        name:  'publishChannel',
        flag:  'closingPC',
        event: 'closePublish',
      });

      await this.closeChannel({
        name:  'subscribeChannel',
        flag:  'closingSC',
        event: 'closeSubscribe',
      });

      await this.connection.close();

      this.connection = null;
      this.connectionFlags.closing = false;
      this.rmqEvents.emit('closeConnection');

      return true;
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
  async sendMessage({
    message, queue, exchange = '', options = {},
  }) {
    try {
      const amqpOptions = await this.parsePublishOptions(options);
      const ch = await this.getPublishChannel();
      return this.sendMessageToMQ({
        options: amqpOptions,
        exchange,
        queue,
        message,
        ch,
      });
    } catch (sendMessageError) {
      const errMsg = `Error sending message: ${sendMessageError.message}`;
      this.debug(errMsg);
      throw Reflect.construct(IError, [{
        name:     'MQ_SEND_MESSAGE_ERROR',
        source:   `${this.sourceIdentifier}.sendMessage`,
        message:  errMsg,
        severity: 'WARNING',
        cause:    sendMessageError,
      }]);
    }
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
  async subscribe({
    consumer, queue = '', exchange = '', topic = '', options = {},
  }) {
    try {
      const ch = await this.getSubscribeChannel();
      const parseResult = await this.parseSubscribeOptions({
        queue, exchange, topic, options, ch,
      });

      return this.subscribeToQueue({
        ...parseResult,
        consumer,
        ch,
      });
    } catch (subscribeError) {
      const errMsg = `Error subscribing to queue "${queue}", exchange "${exchange}, topic "${topic}": ${subscribeError.message}`;
      this.debug(errMsg);
      throw Reflect.construct(IError, [{
        name:     'MQ_SUBSCRIBE_ERROR',
        source:   `${this.sourceIdentifier}.subscribe`,
        message:  errMsg,
        severity: 'WARNING',
        cause:    subscribeError,
      }]);
    }
  }

  /**
   * Unsubscribe from a queue or topic
   * @param {Object} ch queue channel
   * @param {String} consumerTag consumer identification
   * @returns {Promise} resolves on success
   * @public
   */
  async unsubscribe({
    ch, consumerTag,
  }) {
    assert(ch, 'Missing channel object');
    assert(consumerTag, 'Missing consumer tag');
    await ch.cancel(consumerTag, (err) => {
      if (err) {
        this.debug(err);
      }
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
  async parseSubscribeOptions({
    queue, exchange, topic, ch, options = {},
  }) {
    // either queue or exchange and topic must be defined
    assert(queue || (exchange && topic), 'Missing required arguments');
    const { prefetch = false, ...rOptions } = options;
    const computedSubscribeOptions = {
      ...rOptions,
      prefetch,
    };

    const { queue: subscribedQueue } = await this.checkQueue({
      queue,
      exchange,
      topic,
      ch,
      options: rOptions,
    });

    return {
      queue:   subscribedQueue,
      options: computedSubscribeOptions,
    };
  }

  /**
   * Internal method to use for checking queue subscription
   * @param {String} [queue = null] queue where to subscribe
   * @param {String} [exchange = null] exchange to be used when topics are used
   * @param {String} [topic = null] topic where the queue is binded
   * @param {Boolean} [exclusive = true] queue options
   * @param {Boolean} [durable = false] queue options
   * @param {Boolean} [autoDelete = true] queue options
   * @param {Object} ch queue channel
   * @returns {Promise} resolves with queueName on success
   * @private
   */
  async checkQueue({
    queue,
    exchange,
    topic,
    ch,
    options: {
      exclusive = false,
      durable = false,
      autoDelete = true,
    } = {},
  }) {
    const { queue: assertedQueue } = await ch.assertQueue(queue, {
      exclusive,
      durable,
      autoDelete,
    });

    await this.bindQueue({
      queue: assertedQueue,
      exchange,
      topic,
      ch,
    });
    return {
      queue: assertedQueue,
    };
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
  async bindQueue({
    queue, exchange, topic, ch,
  }) {
    await this.checkExchange({
      channel: ch,
      exchange,
    });
    if (exchange === '') {
      return true;
    }
    await ch.bindQueue(queue, exchange, topic)
      .catch((errorBinding) => {
        const errMsg = `Error binding queue "${queue}" to topic "${topic}" on exchange "${exchange}"; severity: ${errorBinding.severity}; message:  ${errorBinding.message}`;
        this.debug(errMsg);
        throw Reflect.construct(IError, [{
          name:     'MQ_BIND_QUEUE_ERROR',
          source:   `${this.sourceIdentifier}.bindQueue`,
          message:  errMsg,
          severity: 'WARNING',
          cause:    errorBinding,
        }]);
      });
    return true;
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
  async subscribeToQueue({
    queue, consumer, options, ch,
  }) {
    // istanbul ignore next
    // eslint-disable-next-line require-jsdoc
    const localConsumer = async (qMessage) => {
      try {
        await consumer({
          nack: async () => {
            this.debug(`NAck message: ${qMessage.fields.consumerTag}`);
            await ch.nack(qMessage);
            return true;
          },
          message:     qMessage.content,
          topic:       qMessage.fields.routingKey,
          exchange:    qMessage.fields.exchange,
          consumerTag: qMessage.fields.consumerTag,
          queue,
        });

        this.debug(`Ack message: ${qMessage.fields.consumerTag}`);
        await ch.ack(qMessage);
        return true;
      } catch (error) {
        this.debug(`Error processing message ${qMessage.fields.consumerTag}: ${error.message}`);
        await ch.ack(qMessage);
        return true;
      }
    };
    ch.prefetch(options.prefetch);
    const { consumerTag } = await ch.consume(queue, localConsumer, { noAck: false });
    return {
      consumerTag,
      queue,
    };
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
  async sendMessageToMQ({
    message, queue, exchange, options, ch,
  }) {
    const publishResult = ch.publish(exchange, queue, message, options);
    if (publishResult) {
      this.debug(`Success sending message on exchange "${exchange}" queue "${queue}"`);
      return true;
    }
    const errMsg = `Error sending message on exchange "${exchange}" queue "${queue}", buffer full`;
    this.debug(errMsg);
    throw Reflect.construct(IError, [{
      name:     'MQ_PUBLISH_MESSAGE_ERROR',
      source:   `${this.sourceIdentifier}.publishMessage`,
      message:  errMsg,
      severity: 'WARNING',
    }]);
  }

  /**
   * parse generic options into amqp specific options
   * @param {Number} number of seconds untill message will expire
   * @returns {Promise} resolves with amqplib options
   * @private
   */
  async parsePublishOptions({ ttl = false }) { // eslint-disable-line class-methods-use-this
    const amqpOptions = {};
    if (ttl) {
      amqpOptions.expiration = `${ttl}000`;
    }
    return amqpOptions;
  }

  /**
   * Checks if requested exchange is defined
   * @param {String} exchange exchange name
   * @param {Object} channel channel to be used for check
   * @returns {Promise} resolves on success
   * @private
   */
  async checkExchange({ exchange, channel }) { // eslint-disable-line class-methods-use-this
    if (exchange === '') {
      return true;
    }
    await channel.checkExchange(exchange);
    return true;
  }

  /**
   * Get RabbitMQ connection
   * @returns {Promise} resolves with connection on success
   * @private
   */
  async getConnection() {
    if (this.connection) {
      return this.connection;
    }
    if (this.connectionFlags.connecting) {
      await this.promiseOnEvent(this.rmqEvents, 'createdConnection');
      return this.connection;
    }
    this.connectionFlags.connecting = true;
    try {
      this.connection = await this.amqplib.connect(this.mqURI);
      this.connectionFlags.connecting = false;
      this.debug(`Successful connected to ${this.mqURI}`);
      this.rmqEvents.emit('createdConnection');
      return this.connection;
    } catch (connectError) {
      const errMsg = `Error connecting to MQ broker: ${connectError.message}`;
      this.debug(errMsg);
      throw Reflect.construct(IError, [{
        name:     'MQ_CONNECT_ERROR',
        source:   `${this.sourceIdentifier}.connect`,
        message:  errMsg,
        severity: 'FATAL',
        cause:    connectError,
      }]);
    }
  }

  /**
   * Create channel
   * @returns {Promise} resolves with publish channel;
   * @private
   */
  async createChannel({ name, flag, event }) {
    this.connectionFlags[flag] = true;
    try {
      const connection = await this.getConnection();
      this[name] = await connection.createConfirmChannel();
      this.debug(`Successful created ${name} channel`);
      this.rmqEvents.emit(event);
      this.connectionFlags[flag] = false;
      return this[name];
    } catch (chError) {
      const errMsg = `Error creating ${name} channel: ${chError.message}`;
      this.debug(errMsg);
      throw Reflect.construct(IError, [{
        name:     'MQ_CHANNEL_ERROR',
        source:   `${this.sourceIdentifier}.createChannel`,
        message:  errMsg,
        severity: 'FATAL',
        cause:    chError,
      }]);
    }
  }

  /**
   * Get publish channel
   * @returns {Promise} resolves with publish channel;
   * @private
   */
  async getPublishChannel() {
    if (this.connectionFlags.publish) {
      if (this.publishChannel) {
        return this.publishChannel;
      }
      if (this.connectionFlags.creatingPC) {
        await this.promiseOnEvent(this.rmqEvents, 'createdPublishChannel');
        return this.publishChannel;
      }
      await this.createChannel({
        name:  'publishChannel',
        flag:  'creatingPC',
        event: 'createdPublishChannel',
      });
      return this.publishChannel;
    }
    const errMsg = 'Publish not allowed';
    this.debug(errMsg);
    throw Reflect.construct(IError, [{
      name:     'MQ_PUBLISH_CHANNEL_ERROR',
      source:   `${this.sourceIdentifier}.getPublishChannel`,
      message:  errMsg,
      severity: 'FATAL',
    }]);
  }

  /**
   * Get Subscribe channel
   * @returns {Promise} resolves with subscribe channel;
   * @private
   */
  async getSubscribeChannel() {
    if (this.connectionFlags.subscribe) {
      if (this.subscribeChannel) {
        return this.subscribeChannel;
      }
      if (this.connectionFlags.creatingSC) {
        await this.promiseOnEvent(this.rmqEvents, 'createdSubscribeChannel');
        return this.subscribeChannel;
      }
      await this.createChannel({
        name:  'subscribeChannel',
        flag:  'creatingSC',
        event: 'createdSubscribeChannel',
      });
      return this.subscribeChannel;
    }
    const errMsg = 'Subscribe not allowed';
    this.debug(errMsg);
    throw Reflect.construct(IError, [{
      name:     'MQ_SUBSCRIBE_CHANNEL_ERROR',
      source:   `${this.sourceIdentifier}.getSubscribeChannel`,
      message:  errMsg,
      severity: 'FATAL',
    }]);
  }

  /**
   * Close a channel
   * @param {String} name channel name
   * @param {String} flag flag name for channel status
   * @param {String} event event name for signalling when channel is closed
   * @returns {Promise} resolves on success
   * @private
   */
  async closeChannel({ name, flag, event }) {
    if (this[name] === null) {
      return Promise.resolve();
    }
    if (!this.connectionFlags[flag]) {
      this.connectionFlags[flag] = true;
      await this[name].waitForConfirms();
      await this[name].close();
      this[name] = null;
      this.connectionFlags[flag] = false;
      this.rmqEvents.emit(event);
      return true;
    }
    return this.promiseOnEvent(this.rmqEvents, event);
  }
}

module.exports = {
  RabbitMQ,
};
