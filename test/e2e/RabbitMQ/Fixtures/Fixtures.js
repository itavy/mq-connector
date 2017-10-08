'use strict';

const mqUri = 'amqp://mqconnuser:mqconnpwd@localhost/test-mq-connector';
const noAccessUri = 'amqp://mqconnuser:mqconnpwd@localhost';

const workQueues = {
  simpleQueue: 'test-q1',
  topicQueue:  {
    queue:      'test-qp1',
    routingKey: 'test.qp1.t1',
    exchange:   'test-exchange1'
  },
  receiveQueue:   'test-q-receive',
  bindTopicQueue: {
    routingKey: `test.bind.${Date.now()}`,
    exchange:   'test-exchange1'
  },
  prefetch: {
    queue:      'test-queue-prefetch',
    routingKey: `test.bind.${Date.now()}`,
    exchange:   'test-exchange1'
  }
};

const testMessages = {
  simpleQueue: Buffer.from('test message queue'),
  topicQueue:  Buffer.from('test message topic'),
  topicQueue2: Buffer.from('test message topic2')
};

module.exports = {
  mqUri,
  noAccessUri,
  workQueues,
  testMessages
};
