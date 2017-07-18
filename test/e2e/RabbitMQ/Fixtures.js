'use strict';

const mqUri = 'amqp://mqconnuser:mqconnpwd@localhost/test-mq-connector';
const noAccessUri = 'amqp://mqconnuser:mqconnpwd@localhost';

const workQueues = [
  'test-q1',
  'test-q2',
  'test-q3',
];
module.exports = {
  mqUri,
  noAccessUri,
  workQueues,
};
