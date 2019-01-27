'use strict';

const amqplib = require('amqplib');
const tap = require('tap');

const connLib = require('../../../');
const fixtures = require('./Fixtures/Fixtures');

tap.test('Receive message on a provided queue', (t) => {
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
      t.equal(exchange, '');
      t.equal(queue, fixtures.workQueues.receiveQueue);
      t.equal(topic, fixtures.workQueues.receiveQueue);
      return Promise.resolve();
    },
    queue:   fixtures.workQueues.receiveQueue,
    options: {
      durable: true,
    },
  })
    .then(() => amqplib.connect(fixtures.mqUri)
      .then((conn) => {
        assertConn = conn;
        return conn.createConfirmChannel();
      })
      .then((ch) => {
        if (ch.publish('', fixtures.workQueues.receiveQueue, fixtures.testMessages.topicQueue)) {
          return Promise.resolve();
        }
        return Promise.reject(Error('Error publish'));
      }))
    .catch(err => t.bailout(err));
});
