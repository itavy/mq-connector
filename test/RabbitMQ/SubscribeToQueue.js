'use strict';

const testUtilities = require('@itavy/test-utilities');
const connLib = require('../../lib/v6x');
const fixtures = require('./Fixtures');

const expect = testUtilities.getExpect();

describe('SubscribeToQueue', () => {
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
    const prefetchStub = sandbox.stub(testConnector.subscribeChannel, 'prefetch')
      .throws(fixtures.testingError);

    return testConnector.subscribeToQueue(fixtures.subscribeQueueRequest)
      .should.be.rejected
      .then((response) => {
        fixtures.testExpectedError({
          error: response,
          name:  'MQ_SUBSCRIBE_ERROR',
        });
        expect(prefetchStub.callCount).to.be.equal(1);
        expect(prefetchStub.getCall(0).args).to.be.eql([
          fixtures.subscribeQueueRequest.options.prefetch,
        ]);

        return Promise.resolve();
      });
  });

  it('Should register provided consumer', () => {
    const subscribeSpy = sandbox.spy(testConnector.subscribeChannel, 'consume');

    return testConnector.subscribeToQueue(fixtures.subscribeQueueRequest)
      .should.be.fulfilled
      .then(() => {
        expect(subscribeSpy.callCount).to.be.equal(1);
        expect(subscribeSpy.getCall(0).args[0]).to.be.equal(fixtures.subscribeQueueRequest.queue);

        return Promise.resolve();
      });
  });
});
