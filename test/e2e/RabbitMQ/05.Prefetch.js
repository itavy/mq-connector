'use strict';

const amqplib = require('amqplib');
const tap = require('tap');

const connLib = require('../../../');
const fixtures = require('./Fixtures/Fixtures');

tap.test('Send message on topic', (t) => {
  t.plan(12);
  let testConnector;
  let testConnector2;
  let assertConn;
  let blockAck;

  t.tearDown(() => {
    blockAck();
    testConnector.close();
    testConnector2.close();
    assertConn.close();
  });

  testConnector = connLib.getConnector(connLib.types.RABBIT_MQ, {
    mqURI: fixtures.mqUri,
  });

  testConnector2 = connLib.getConnector(connLib.types.RABBIT_MQ, {
    mqURI: fixtures.mqUri,
  });

  testConnector.subscribe({
    consumer: ({
      message, exchange, queue, topic,
    }) => new Promise((resolve) => {
      blockAck = resolve;
      t.same(message, fixtures.testMessages.topicQueue);
      t.equal(queue, fixtures.workQueues.prefetch.queue);
      t.equal(exchange, fixtures.workQueues.prefetch.exchange);
      t.equal(topic, fixtures.workQueues.prefetch.routingKey);
    }),
    options: {
      prefetch: 1,
      durable:  true,
    },
    queue:    fixtures.workQueues.prefetch.queue,
    exchange: fixtures.workQueues.prefetch.exchange,
    topic:    fixtures.workQueues.prefetch.routingKey,
  })
    .then(() => testConnector2.subscribe({
      consumer: ({
        message, exchange, queue, topic,
      }) => {
        t.same(message, fixtures.testMessages.topicQueue2);
        t.equal(queue, fixtures.workQueues.prefetch.queue);
        t.equal(exchange, fixtures.workQueues.prefetch.exchange);
        t.equal(topic, fixtures.workQueues.prefetch.routingKey);
        return Promise.resolve();
      },
      options: {
        prefetch: 1,
        durable:  true,
      },
      queue:    fixtures.workQueues.prefetch.queue,
      exchange: fixtures.workQueues.prefetch.exchange,
      topic:    fixtures.workQueues.prefetch.routingKey,
    }))
    .then(() => amqplib.connect(fixtures.mqUri)
      .then((conn) => {
        assertConn = conn;
        return conn.createConfirmChannel();
      })
      .then((ch) => {
        if (!ch.publish(
          fixtures.workQueues.prefetch.exchange,
          fixtures.workQueues.prefetch.routingKey, fixtures.testMessages.topicQueue
        )) {
          return Promise.reject(Error('1. Error publish'));
        }
        if (!ch.publish(
          fixtures.workQueues.prefetch.exchange,
          fixtures.workQueues.prefetch.routingKey, fixtures.testMessages.topicQueue2
        )) {
          return Promise.reject(Error('2. Error publish'));
        }
        if (!ch.publish(
          fixtures.workQueues.prefetch.exchange,
          fixtures.workQueues.prefetch.routingKey, fixtures.testMessages.topicQueue2
        )) {
          return Promise.reject(Error('3. Error publish'));
        }
        return Promise.resolve();
      }))
    .catch(err => t.bailout(err));
});
