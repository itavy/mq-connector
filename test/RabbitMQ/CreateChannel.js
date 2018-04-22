'use strict';

const { expect, getSinonSandbox } = require('@itavy/test-utilities');
const connLib = require('../../');
const fixtures = require('./Fixtures');


describe('CreateChannel', () => {
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
    done();
  });

  afterEach((done) => {
    sandbox.restore();
    testConnector = null;
    done();
  });

  it('Should reject with specific error', () => {
    const connectFail =
      sandbox.stub(testConnector, 'getConnection').rejects(fixtures.testingError);

    return testConnector.createChannel({})
      .should.be.rejected
      .then((response) => {
        fixtures.testExpectedError({
          error: response,
          name:  'MQ_CHANNEL_ERROR',
        });
        expect(connectFail.callCount).to.be.equal(1);

        return Promise.resolve();
      });
  });

  it('Should call createConfirmChannel', () => {
    const createConfirmChannelFail =
      sandbox.stub(fixtures.amqpConnection, 'createConfirmChannel').rejects(fixtures.testingError);

    return testConnector.createChannel(fixtures.createChannelOptions.publish)
      .should.be.rejected
      .then((response) => {
        fixtures.testExpectedError({
          error: response,
          name:  'MQ_CHANNEL_ERROR',
        });
        expect(createConfirmChannelFail.callCount).to.be.equal(1);
        expect(testConnector.connectionFlags[fixtures.createChannelOptions.publish.flag])
          .to.be.equal(true);
        return Promise.resolve();
      });
  });

  it('Should resolve and emit event for create channel', () => {
    const createChannelSpy = sandbox.spy();

    testConnector.rmqEvents.on(fixtures.createChannelOptions.publish.event, createChannelSpy);
    return testConnector.createChannel(fixtures.createChannelOptions.publish)
      .should.be.fulfilled
      .then((response) => {
        expect(response).to.be.equal(fixtures.amqpChannel);
        expect(response).to.be.equal(testConnector.publishChannel);
        expect(testConnector.connectionFlags[fixtures.createChannelOptions.publish.flag])
          .to.be.equal(false);
        expect(createChannelSpy.callCount).to.be.equal(1);
        return Promise.resolve();
      });
  });
});
