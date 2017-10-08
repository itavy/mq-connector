'use strict';

const testUtilities = require('@itavy/test-utilities');
const connLib = require('../../lib/v6x');
const fixtures = require('./Fixtures');

const expect = testUtilities.getExpect();

describe('GetSubscribeChannel', () => {
  let sandbox;
  let testConnector;

  beforeEach((done) => {
    sandbox = testUtilities.getSinonSandbox();
    testConnector = connLib.getConnector(connLib.types.RABBIT_MQ, Object.assign(
      {},
      fixtures.rabbitmqConnOptions,
      {
        amqplib: fixtures.amqpLib
      }
    ));
    done();
  });

  afterEach((done) => {
    sandbox.restore();
    testConnector = null;
    done();
  });

  it('Should fail for subscribe not allowed', () => {
    testConnector.connectionFlags.subscribe = false;

    return testConnector.getSubscribeChannel({})
      .should.be.rejected
      .then((response) => {
        fixtures.testExpectedError({
          error: response,
          name:  'MQ_SUBSCRIBE_CHANNEL_ERROR'
        });

        return Promise.resolve();
      });
  });

  it('Should call createChannel with expected parameters', () => {
    const createChannelStub =
      sandbox.stub(testConnector, 'createChannel').rejects(fixtures.testingError);

    return testConnector.getSubscribeChannel({})
      .should.be.rejected
      .then((response) => {
        fixtures.testExpectedError({
          error: response,
          name:  'MQ_SUBSCRIBE_CHANNEL_ERROR'
        });

        expect(createChannelStub.callCount).to.be.equal(1);
        expect(createChannelStub.getCall(0).args[0])
          .to.be.eql(fixtures.createChannelOptions.subscribe);

        return Promise.resolve();
      });
  });

  it('Should resolve with subscribeChannel', () => testConnector.getSubscribeChannel()
    .should.be.fulfilled
    .then((response) => {
      expect(response).to.be.equal(testConnector.subscribeChannel);

      return Promise.resolve();
    }));

  it('Should resolve with existing channel', () => testConnector.getSubscribeChannel(fixtures.createChannelOptions.subscribe)
    .then((ch) => {
      const createChannelSpy = sandbox.spy(testConnector, 'createChannel');

      return testConnector.getSubscribeChannel(fixtures.createChannelOptions.subscribe)
        .should.be.fulfilled
        .then((response) => {
          expect(response).to.be.equal(ch);
          expect(createChannelSpy.callCount).to.be.equal(0);

          return Promise.resolve();
        });
    }));

  it('Should resolve with same channel after first call succed', () => {
    const createChannelSpy = sandbox.spy();
    let subscribeChannel;

    testConnector.rmqEvents.on(fixtures.createChannelOptions.subscribe.event, createChannelSpy);
    testConnector.getSubscribeChannel()
      .then((response) => {
        subscribeChannel = response;
      });

    return testConnector.getSubscribeChannel()
      .should.be.fulfilled
      .then((response) => {
        expect(response).to.be.equal(subscribeChannel);
        expect(createChannelSpy.callCount).to.be.equal(1);

        return Promise.resolve();
      });
  });
});
