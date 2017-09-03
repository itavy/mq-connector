'use strict';

const mqUri = 'amqp://mqconnuser:mqconnpwd@localhost/test-mq-connector';
const noAccessUri = 'amqp://mqconnuser:mqconnpwd@localhost';

const workQueues = {
  simpleQueue: 'test-q1',
  topicQueue:  {
    queue:      'test-qp1',
    routingKey: 'test.qp1.t1',
    exchange:   'test-exchange1',
  },
  receiveQueue: 'test-q-receive',
};

const testMessages = {
  simpleQueue: Buffer.from('test message queue'),
  topicQueue:  Buffer.from('test message topic'),
};

module.exports = {
  mqUri,
  noAccessUri,
  workQueues,
  testMessages,
};
