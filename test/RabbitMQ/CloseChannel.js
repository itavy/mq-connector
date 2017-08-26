'use strict';

const testUtilities = require('@itavy/test-utilities');
const connLib = require('../../lib/v6x');
const fixtures = require('./Fixtures');

const expect = testUtilities.getExpect();

describe('CloseChannel', () => {
  let sandbox;
  let testConnector;

  beforeEach((done) => {
    sandbox = testUtilities.getSinonSandbox();
    testConnector = connLib.getConnector(connLib.types.RABBIT_MQ, Object.assign({},
      fixtures.rabbitmqConnOptions,
      {
        amqplib: fixtures.amqpLib,
      }));
    done();
  });

  afterEach((done) => {
    sandbox.restore();
    testConnector = null;
    done();
  });

  it('Should resosolve if channel does not exist', () =>
    testConnector.closeChannel(fixtures.closeChannelOptions.publish)
      .should.be.fulfilled
      .then(() => Promise.resolve()));

  it('Should wait for confirms before closing', () => {
    const waitStub = sandbox.stub(fixtures.amqpChannel, 'waitForConfirms').rejects(fixtures.testingError);

    return testConnector.getPublishChannel()
      .then(() => testConnector.closeChannel(fixtures.closeChannelOptions.publish)
        .should.be.rejected
        .then((response) => {
          expect(response).to.be.equal(fixtures.testingError);
          expect(waitStub.callCount).to.be.equal(1);
          expect(testConnector.connectionFlags[fixtures.closeChannelOptions.publish.flag])
            .to.be.equal(true);
          return Promise.resolve();
        }));
  });

  it('Should call channel close method', () => {
    const closeStub = sandbox.stub(fixtures.amqpChannel, 'close').rejects(fixtures.testingError);

    return testConnector.getPublishChannel()
      .then(() => testConnector.closeChannel(fixtures.closeChannelOptions.publish)
        .should.be.rejected
        .then((response) => {
          expect(response).to.be.equal(fixtures.testingError);
          expect(closeStub.callCount).to.be.equal(1);
          expect(testConnector.connectionFlags[fixtures.closeChannelOptions.publish.flag])
            .to.be.equal(true);
          return Promise.resolve();
        }));
  });

  it('Should emit close event', () => {
    const closeSpy = sandbox.spy();

    testConnector.rmqEvents.on(fixtures.closeChannelOptions.publish.event, closeSpy);

    return testConnector.getPublishChannel()
      .then(() => testConnector.closeChannel(fixtures.closeChannelOptions.publish)
        .should.be.fulfilled
        .then(() => {
          expect(closeSpy.callCount).to.be.equal(1);
          expect(testConnector.connectionFlags[fixtures.closeChannelOptions.publish.flag])
            .to.be.equal(false);
          expect(testConnector[fixtures.closeChannelOptions.publish.name]).to.be.equal(null);
          return Promise.resolve();
        }));
  });

  it('Should resolve pending close', () => {
    const closeSpy = sandbox.spy();

    testConnector.rmqEvents.on(fixtures.closeChannelOptions.publish.event, closeSpy);

    return testConnector.getPublishChannel()
      .then(() => {
        testConnector.closeChannel(fixtures.closeChannelOptions.publish);
        return testConnector.closeChannel(fixtures.closeChannelOptions.publish)
          .should.be.fulfilled
          .then(() => {
            expect(closeSpy.callCount).to.be.equal(1);
            expect(testConnector.connectionFlags[fixtures.closeChannelOptions.publish.flag])
              .to.be.equal(false);
            expect(testConnector[fixtures.closeChannelOptions.publish.name]).to.be.equal(null);
            return Promise.resolve();
          });
      });
  });
});
