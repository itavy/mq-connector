'use strict';

const mqUri = 'amqp://mqconnuser:mqconnpwd@localhost/test-mq-connector';
const noAccessUri = 'amqp://mqconnuser:mqconnpwd@localhost';

const workQueues = {
  simpleQueue: 'test-q1',
};

const testMessages = {
  simpleQueue: Buffer.from('test message'),
};

module.exports = {
  mqUri,
  noAccessUri,
  workQueues,
  testMessages,
};
