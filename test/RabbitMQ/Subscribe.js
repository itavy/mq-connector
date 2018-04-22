'use strict';

const { expect, getSinonSandbox } = require('@itavy/test-utilities');
const connLib = require('../../');
const fixtures = require('./Fixtures');


describe('Subscribe', () => {
  let sandbox;
  let testConnector;

  beforeEach((done) => {
    sandbox = getSinonSandbox();
    testConnector = connLib.getConnector(connLib.types.RABBIT_MQ, Object.assign(
      {},
      fixtures.rabbitmqConnOptions,
      {
        amqplib: fixtures.amqpLib,
      }
    ));
    return done();
  });

  afterEach((done) => {
    sandbox.restore();
    testConnector = null;
    done();
  });

  it('Should fail with known error', () => {
    const parseStub = sandbox.stub(testConnector, 'getSubscribeChannel')
      .rejects(fixtures.testingError);

    return testConnector.subscribe(fixtures.subscribeQueueRequest)
      .should.be.rejected
      .then((response) => {
        fixtures.testExpectedError({
          error: response,
          name:  'MQ_SUBSCRIBE_ERROR',
        });
        expect(parseStub.callCount).to.be.equal(1);
        return Promise.resolve();
      });
  });

  it('Should fail with known error for subscribing', () => {
    const parseStub = sandbox.stub(testConnector, 'parseSubscribeOptions')
      .rejects(fixtures.testingError);

    return testConnector.subscribe(fixtures.subscribeQueueRequest)
      .should.be.rejected
      .then((response) => {
        fixtures.testExpectedError({
          error: response,
          name:  'MQ_SUBSCRIBE_ERROR',
        });
        expect(parseStub.callCount).to.be.equal(1);
        expect(parseStub.getCall(0).args[0]).to.be.eql({
          queue:    fixtures.subscribeQueueRequest.queue,
          options:  fixtures.subscribeQueueRequest.options,
          exchange: '',
          topic:    '',
          ch:       fixtures.amqpChannel,
        });

        return Promise.resolve();
      });
  });

  it('Should fail for invalid exchange', () => {
    sandbox.stub(fixtures.amqpChannel, 'checkExchange').rejects(fixtures.testingError);

    return testConnector.subscribe(fixtures.subscribeTopicRequest)
      .should.be.rejected
      .then((response) => {
        fixtures.testExpectedError({
          error: response,
          name:  'MQ_SUBSCRIBE_ERROR',
        });

        return Promise.resolve();
      });
  });

  it('Should subscribe to provided queue', () => {
    const subscribeSpy = sandbox.spy(fixtures.amqpChannel, 'consume');

    return testConnector.subscribe(fixtures.subscribeQueueRequest)
      .should.be.fulfilled
      .then(() => {
        expect(subscribeSpy.callCount).to.be.equal(1);
        expect(subscribeSpy.getCall(0).args[0]).to.be.equal(fixtures.subscribeQueueRequest.queue);

        return Promise.resolve();
      });
  });
});
