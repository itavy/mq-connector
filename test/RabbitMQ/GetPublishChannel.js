'use strict';

const testUtilities = require('@itavy/test-utilities');
const connLib = require('../../lib/v6x');
const fixtures = require('./Fixtures');

const expect = testUtilities.getExpect();

describe('GetPublishChannel', () => {
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

  it('Should fail for publish not allowed', () => {
    testConnector.connectionFlags.publish = false;

    return testConnector.getPublishChannel({})
      .should.be.rejected
      .then((response) => {
        fixtures.testExpectedError({
          error: response,
          name:  'MQ_PUBLISH_CHANNEL_ERROR'
        });

        return Promise.resolve();
      });
  });

  it('Should call createChannel with expected parameters', () => {
    const createChannelStub =
      sandbox.stub(testConnector, 'createChannel').rejects(fixtures.testingError);

    return testConnector.getPublishChannel({})
      .should.be.rejected
      .then((response) => {
        fixtures.testExpectedError({
          error: response,
          name:  'MQ_PUBLISH_CHANNEL_ERROR'
        });

        expect(createChannelStub.callCount).to.be.equal(1);
        expect(createChannelStub.getCall(0).args[0])
          .to.be.eql(fixtures.createChannelOptions.publish);

        return Promise.resolve();
      });
  });

  it('Should resolve with publishChannel', () => testConnector.getPublishChannel()
    .should.be.fulfilled
    .then((response) => {
      expect(response).to.be.equal(testConnector.publishChannel);

      return Promise.resolve();
    }));

  it('Should resolve with existing channel', () => testConnector.getPublishChannel(fixtures.createChannelOptions.publish)
    .then((ch) => {
      const createChannelSpy = sandbox.spy(testConnector, 'createChannel');

      return testConnector.getPublishChannel(fixtures.createChannelOptions.publish)
        .should.be.fulfilled
        .then((response) => {
          expect(response).to.be.equal(ch);
          expect(createChannelSpy.callCount).to.be.equal(0);

          return Promise.resolve();
        });
    }));

  it('Should resolve with same channel after first call succed', () => {
    const createChannelSpy = sandbox.spy();
    let publishChannel;

    testConnector.rmqEvents.on(fixtures.createChannelOptions.publish.event, createChannelSpy);
    testConnector.getPublishChannel()
      .then((response) => {
        publishChannel = response;
      });

    return testConnector.getPublishChannel()
      .should.be.fulfilled
      .then((response) => {
        expect(response).to.be.equal(publishChannel);
        expect(createChannelSpy.callCount).to.be.equal(1);

        return Promise.resolve();
      });
  });
});
