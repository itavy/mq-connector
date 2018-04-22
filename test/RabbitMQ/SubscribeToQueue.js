'use strict';

const { expect, getSinonSandbox } = require('@itavy/test-utilities');
const connLib = require('../../');
const fixtures = require('./Fixtures');


describe('SubscribeToQueue', () => {
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

  it('Should fail if there is an error subscribing', () => {
    const consumeStub = sandbox.stub(fixtures.amqpChannel, 'consume')
      .throws(fixtures.testingError);

    return testConnector.subscribeToQueue(Object.assign(
      {},
      fixtures.subscribeQueueRequest,
      {
        ch: fixtures.amqpChannel,
      }
    ))
      .should.be.rejected
      .then((response) => {
        expect(response).to.be.eql(fixtures.testingError);
        expect(consumeStub.callCount).to.be.equal(1);

        return Promise.resolve();
      });
  });

  it('Should register provided consumer', () => {
    const subscribeSpy = sandbox.spy(fixtures.amqpChannel, 'consume');

    return testConnector.subscribeToQueue(Object.assign(
      {},
      fixtures.subscribeQueueRequest,
      {
        ch: fixtures.amqpChannel,
      }
    ))
      .should.be.fulfilled
      .then(() => {
        expect(subscribeSpy.callCount).to.be.equal(1);
        expect(subscribeSpy.getCall(0).args[0]).to.be.equal(fixtures.subscribeQueueRequest.queue);

        return Promise.resolve();
      });
  });

  it('Should return queue where it subscribed', () =>
    testConnector.subscribeToQueue(Object.assign(
      {},
      fixtures.subscribeQueueRequest,
      {
        ch: fixtures.amqpChannel,
      }
    ))
      .should.be.fulfilled
      .then((response) => {
        expect(response).to.have.property('queue');
        return Promise.resolve();
      }));

  it('Should return consumer tag for subscribed queue', () =>
    testConnector.subscribeToQueue(Object.assign(
      {},
      fixtures.subscribeQueueRequest,
      {
        ch: fixtures.amqpChannel,
      }
    ))
      .should.be.fulfilled
      .then((response) => {
        expect(response).to.have.property('consumerTag');
        return Promise.resolve();
      }));
});
