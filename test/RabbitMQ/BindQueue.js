'use strict';

const { expect, getSinonSandbox } = require('@itavy/test-utilities');
const connLib = require('../../lib/v6x');
const fixtures = require('./Fixtures');

describe('BindQueue', () => {
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

  it('Should fail with expected error', () => {
    sandbox.stub(fixtures.amqpChannel, 'bindQueue').rejects(fixtures.testingError);

    return testConnector.bindQueue(Object.assign({}, fixtures.messageOnTopic, {
      ch: fixtures.amqpChannel,
    }))
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
    const chBindQueue = sandbox.spy(fixtures.amqpChannel, 'bindQueue');

    return testConnector.bindQueue(Object.assign({}, fixtures.messageOnTopic, {
      ch: fixtures.amqpChannel,
    }))
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
