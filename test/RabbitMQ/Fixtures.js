'use strict';

const expect = require('@itavy/test-utilities').getExpect();

const rabbitmqConnOptions = {
  mqURI: 'amqp://testuser:testpwd@slocalhost/vhost?heartbeat=1',
};

const generatedQueue = 'generatedQueue';

const amqpChannel = {
  publish:       () => true,
  checkExchange: () => Promise.resolve(),
  bindQueue:     () => Promise.resolve(),
  assertQueue:   (queue = generatedQueue) => Promise.resolve({
    queue,
  }),
  consume:  () => Promise.resolve(),
  prefetch: () => null,
};

const amqpConnection = {
  createConfirmChannel: () => Promise.resolve(amqpChannel),
};

const amqpLib = {
  connect: () => Promise.resolve(amqpConnection),
};

const testingError = Error('testing error');

const messageOnQueueOnly = {
  queue:    'testingQueue',
  exchange: '',
  topic:    '',
};

const messageOnTopic = {
  queue:    'testingQueue',
  exchange: 'testingExchange',
  topic:    'testing.topic.mq',
};

const badMessageOnTopic = {
  exchange: 'testingExchange',
};


const subscribeQueueRequest = {
  queue:   'testingQueue',
  options: {
    prefetch: 13,
  },
  consumer: () => null,
};

const subscribeTopicRequest = {
  exchange: 'testingExchange',
  topic:    'testing.topic.mq',
  consumer: () => null,
};

const publishMessage = {
  queue:    'testQueue',
  exchange: '',
  message:  Buffer.from('testmessage'),
  options:  {},
};

/**
 * tests if provided error has expected name and has cause a specific error
 * @param {IError} error error to be tested
 * @param {String} name expected name
 * @returns {undefined} returns nothing on success
 */
const testExpectedError = ({ error, name }) => {
  expect(error).to.have.property('name', name);
  expect(error.hasErrorWithName(testingError.name)).to.be.equal(true);
};

module.exports = {
  rabbitmqConnOptions,
  amqpLib,
  amqpConnection,
  amqpChannel,
  generatedQueue,
  testingError,
  testExpectedError,
  messageOnQueueOnly,
  messageOnTopic,
  badMessageOnTopic,
  subscribeQueueRequest,
  subscribeTopicRequest,
  publishMessage,
};
