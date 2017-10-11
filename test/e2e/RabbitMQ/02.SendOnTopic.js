'use strict';

const connLib = require('../../../lib/v6x');
const fixtures = require('./Fixtures/Fixtures');
const amqplib = require('amqplib');

const tap = require('tap');

tap.test('Send message on topic', (t) => {
  t.plan(3);
  let testConnector;
  let assertConn;

  t.tearDown(() => {
    testConnector.close();
    assertConn.close();
  });

  testConnector = connLib.getConnector(connLib.types.RABBIT_MQ, {
    mqURI: fixtures.mqUri,
  });

  amqplib.connect(fixtures.mqUri)
    .then((conn) => {
      assertConn = conn;
      return conn.createConfirmChannel();
    })
    .then(ch => ch.consume(fixtures.workQueues.topicQueue.queue, (qMessage) => {
      t.same(qMessage.content, fixtures.testMessages.topicQueue);
      t.equal(qMessage.fields.routingKey, fixtures.workQueues.topicQueue.routingKey);
      t.equal(qMessage.fields.exchange, fixtures.workQueues.topicQueue.exchange);
    }, { noAck: true }))
    .then(() => testConnector.sendMessage({
      message:  fixtures.testMessages.topicQueue,
      queue:    fixtures.workQueues.topicQueue.routingKey,
      exchange: fixtures.workQueues.topicQueue.exchange,
    }))
    .catch(err => t.bailout(err));
});
