'use strict';

const { expect, getSinonSandbox } = require('@itavy/test-utilities');
const connLib = require('../../');
const fixtures = require('./Fixtures');

describe('CheckQueue', () => {
  let sandbox;
  let testConnector;

  beforeEach((done) => {
    sandbox = getSinonSandbox();
    testConnector = connLib.getConnector(connLib.types.RABBIT_MQ, {
      ...fixtures.rabbitmqConnOptions,
      amqplib: fixtures.amqpLib,
    });
    return done();
  });

  afterEach((done) => {
    sandbox.restore();
    testConnector = null;
    done();
  });

  it('Should reject if there is an error checking queue', () => {
    sandbox.stub(fixtures.amqpChannel, 'assertQueue').rejects(fixtures.testingError);

    return testConnector.checkQueue({
      ...fixtures.messageOnQueueOnly,
      ch: fixtures.amqpChannel,
    })
      .should.be.rejected
      .then((response) => {
        expect(response).to.be.eql(fixtures.testingError);
        return Promise.resolve();
      });
  });

  it('Should reject with fatal error', () => {
    sandbox.stub(fixtures.amqpChannel, 'checkExchange').rejects(fixtures.testingError);

    return testConnector.checkQueue({
      ...fixtures.messageOnTopic,
      ch: fixtures.amqpChannel,
    })
      .should.be.rejected
      .then((response) => {
        expect(response).to.be.eql(fixtures.testingError);

        return Promise.resolve();
      });
  });

  it('Should resolve with provided queue', () => {
    const assertQueueSpy = sandbox.spy(fixtures.amqpChannel, 'assertQueue');

    return testConnector.checkQueue({
      ...fixtures.messageOnQueueOnly,
      ch: fixtures.amqpChannel,
    })
      .should.be.fulfilled
      .then((response) => {
        expect(response).to.have.property('queue', fixtures.messageOnQueueOnly.queue);
        expect(assertQueueSpy.callCount).to.be.equal(1);
        expect(assertQueueSpy.getCall(0).args).to.be.eql([
          fixtures.messageOnQueueOnly.queue,
          {
            exclusive:  false,
            durable:    false,
            autoDelete: true,
          },
        ]);
        return Promise.resolve();
      });
  });

  it(
    'Should resolve with a generated queue if none provided',
    () => testConnector.checkQueue({
      exchange: fixtures.messageOnTopic.exchange,
      topic:    fixtures.messageOnTopic.topic,
      ch:       fixtures.amqpChannel,
    })
      .should.be.fulfilled
      .then((response) => {
        expect(response).to.have.property('queue', fixtures.generatedQueue);
        return Promise.resolve();
      })
  );
});
