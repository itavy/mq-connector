'use strict';

const testUtilities = require('@itavy/test-utilities');
const connLib = require('../../lib/v6x');
const fixtures = require('./Fixtures');

const expect = testUtilities.getExpect();

describe('CheckQueue', () => {
  let sandbox;
  let testConnector;

  beforeEach((done) => {
    sandbox = testUtilities.getSinonSandbox();
    testConnector = connLib.getConnector(connLib.types.RABBIT_MQ, Object.assign({},
      fixtures.rabbitmqConnOptions,
      {
        amqplib: fixtures.amqpLib,
      }));
    return done();
  });

  afterEach((done) => {
    sandbox.restore();
    testConnector = null;
    done();
  });

  it('Should reject if there is an error checking queue', () => {
    sandbox.stub(fixtures.amqpChannel, 'assertQueue').rejects(fixtures.testingError);

    return testConnector.checkQueue(Object.assign({}, fixtures.messageOnQueueOnly, {
      ch: fixtures.amqpChannel,
    }))
      .should.be.rejected
      .then((response) => {
        fixtures.testExpectedError({
          error: response,
          name:  'MQ_CHECK_QUEUE_ERROR',
        });
        expect(response).to.have.property('severity', 'WARNING');
        return Promise.resolve();
      });
  });

  it('Should reject with fatal error', () => {
    sandbox.stub(fixtures.amqpChannel, 'checkExchange').rejects(fixtures.testingError);

    return testConnector.checkQueue(Object.assign({}, fixtures.messageOnTopic, {
      ch: fixtures.amqpChannel,
    }))
      .should.be.rejected
      .then((response) => {
        fixtures.testExpectedError({
          error: response,
          name:  'MQ_CHECK_QUEUE_ERROR',
        });
        expect(response).to.have.property('severity', 'FATAL');

        return Promise.resolve();
      });
  });

  it('Should resolve with provided queue', () => {
    const assertQueueSpy = sandbox.spy(fixtures.amqpChannel, 'assertQueue');

    testConnector.checkQueue(Object.assign({}, fixtures.messageOnQueueOnly, {
      ch: fixtures.amqpChannel,
    }))
      .should.be.fulfilled
      .then((response) => {
        expect(response).to.have.property('queue', fixtures.messageOnQueueOnly.queue);
        expect(assertQueueSpy.callCount).to.be.equal(1);
        expect(assertQueueSpy.getCall(0).args).to.be.eql([
          fixtures.messageOnQueueOnly.queue,
          testConnector.subscribeQueueOptions,
        ]);
        return Promise.resolve();
      });
  });

  it('Should resolve with a generated queue if none provided',
    () => testConnector.checkQueue({
      exchange: fixtures.messageOnTopic.exchange,
      topic:    fixtures.messageOnTopic.topic,
      ch:       fixtures.amqpChannel,
    })
      .should.be.fulfilled
      .then((response) => {
        expect(response).to.have.property('queue', fixtures.generatedQueue);
        return Promise.resolve();
      }));
});
