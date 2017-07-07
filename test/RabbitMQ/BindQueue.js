'use strict';

const testUtilities = require('@itavy/test-utilities');
const connLib = require('../../lib/v6x');
const fixtures = require('./Fixtures');

const expect = testUtilities.getExpect();

describe('BindQueue', () => {
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

  it('Should resolve with queue if exchange is empty',
    () => testConnector.bindQueue(fixtures.messageOnQueueOnly)
      .should.be.fulfilled
      .then((response) => {
        expect(response).to.be.eql({ queue: fixtures.messageOnQueueOnly.queue });
        return Promise.resolve();
      }));

  it('Should fail with expected error', () => {
    sandbox.stub(testConnector.subscribeChannel, 'bindQueue').rejects(fixtures.testingError);

    return testConnector.bindQueue(fixtures.messageOnTopic)
      .should.be.rejected
      .then((response) => {
        fixtures.testExpectedError({
          error: response,
          name:  'MQ_BIND_QUEUE_ERROR',
        });
        return Promise.resolve();
      });
  });

  it('Should resolve with provided queue binded', () => {
    const chBindQueue = sandbox.spy(testConnector.subscribeChannel, 'bindQueue');

    return testConnector.bindQueue(fixtures.messageOnTopic)
      .should.be.fulfilled
      .then((response) => {
        expect(response).to.be.eql({ queue: fixtures.messageOnQueueOnly.queue });

        expect(chBindQueue.callCount).to.be.equal(1);
        expect(chBindQueue.getCall(0).args).to.be.eql([
          fixtures.messageOnTopic.queue,
          fixtures.messageOnTopic.exchange,
          fixtures.messageOnTopic.topic,
        ]);
        return Promise.resolve();
      });
  });
});
