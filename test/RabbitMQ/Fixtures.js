'use strict';

const rabbitmqConnOptions = {
  mqURI: 'amqp://testuser:testpwd@slocalhost/vhost?heartbeat=1',
};

const amqpChannel = {
  publish: () => null,

};

const amqpConnection = {
  createConfirmChannel: () => Promise.resolve(amqpChannel),
};

const amqpLib = {
  connect: () => Promise.resolve(amqpConnection),
};

const testingError = Error('testing error');

module.exports = {
  rabbitmqConnOptions,
  amqpLib,
  amqpConnection,
  amqpChannel,
  testingError,
};
