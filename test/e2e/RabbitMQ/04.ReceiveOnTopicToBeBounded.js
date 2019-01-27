'use strict';

const amqplib = require('amqplib');
const tap = require('tap');

const connLib = require('../../../');
const fixtures = require('./Fixtures/Fixtures');

tap.test('Send message on topic bounded to a autogenerated queue', (t) => {
  t.plan(4);
  let testConnector;
  let assertConn;

  t.tearDown(() => {
    testConnector.close();
    assertConn.close();
  });

  testConnector = connLib.getConnector(connLib.types.RABBIT_MQ, {
    mqURI: fixtures.mqUri,
  });

  testConnector.subscribe({
    consumer: ({
      message, exchange, queue, topic,
    }) => {
      t.same(message, fixtures.testMessages.topicQueue);
      t.ok(queue.length > 0);
      t.equal(exchange, fixtures.workQueues.bindTopicQueue.exchange);
      t.equal(topic, fixtures.workQueues.bindTopicQueue.routingKey);
      return Promise.resolve();
    },
    exchange: fixtures.workQueues.bindTopicQueue.exchange,
    topic:    fixtures.workQueues.bindTopicQueue.routingKey,
  })
    .then(() => amqplib.connect(fixtures.mqUri)
      .then((conn) => {
        assertConn = conn;
        return conn.createConfirmChannel();
      })
      .then((ch) => {
        if (ch.publish(
          fixtures.workQueues.bindTopicQueue.exchange,
          fixtures.workQueues.bindTopicQueue.routingKey, fixtures.testMessages.topicQueue
        )) {
          return Promise.resolve();
        }
        return Promise.reject(Error('Error publish'));
      }))
    .catch(err => t.bailout(err));
});
