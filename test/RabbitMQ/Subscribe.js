'use strict';

const testUtilities = require('@itavy/test-utilities');
const connLib = require('../../lib/v6x');
const fixtures = require('./Fixtures');

const expect = testUtilities.getExpect();

describe('Subscribe', () => {
  let sandbox;
  let testConnector;

  beforeEach((done) => {
    sandbox = testUtilities.getSinonSandbox();
    testConnector = connLib.getConnector(connLib.types.RABBIT_MQ, Object.assign({},
      fixtures.rabbitmqConnOptions,
      {
        amqplib: fixtures.amqpLib,
      }));
    testConnector.connect()
      .then(() => done());
  });

  afterEach((done) => {
    sandbox.restore();
    testConnector = null;
    done();
  });

  it('Should fail with known error', () => {
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
        });

        return Promise.resolve();
      });
  });

  it('Should fail with fatal error if provided', () => {
    sandbox.stub(testConnector.subscribeChannel, 'checkExchange').rejects(fixtures.testingError);

    return testConnector.subscribe(fixtures.subscribeTopicRequest)
      .should.be.rejected
      .then((response) => {
        fixtures.testExpectedError({
          error: response,
          name:  'MQ_SUBSCRIBE_ERROR',
        });
        expect(response).to.have.property('severity', 'FATAL');

        return Promise.resolve();
      });
  });

  it('Should subscribe to provided queue', () => {
    const subscribeSpy = sandbox.spy(testConnector.subscribeChannel, 'consume');

    return testConnector.subscribe(fixtures.subscribeQueueRequest)
      .should.be.fulfilled
      .then(() => {
        expect(subscribeSpy.callCount).to.be.equal(1);
        expect(subscribeSpy.getCall(0).args[0]).to.be.equal(fixtures.subscribeQueueRequest.queue);

        return Promise.resolve();
      });
  });
});
