'use strict';

const { expect, getSinonSandbox } = require('@itavy/test-utilities');
const connLib = require('../../');
const fixtures = require('./Fixtures');


describe('SendMessageToMQ', () => {
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

  it('Should fail with known error when the buffer is full', () => {
    const publishStub = sandbox.stub().returns(false);

    return testConnector.sendMessageToMQ(Object.assign(
      {},
      fixtures.publishMessage,
      {
        ch: {
          publish: publishStub,
        },
      }
    ))
      .should.be.rejected
      .then((response) => {
        expect(response).to.have.property('name', 'MQ_PUBLISH_MESSAGE_ERROR_BUFFER_FULL');
        expect(publishStub.callCount).to.be.equal(1);
        expect(publishStub.getCall(0).args.slice(0, 4)).to.be.eql([
          fixtures.publishMessage.exchange,
          fixtures.publishMessage.queue,
          fixtures.publishMessage.message,
          fixtures.publishMessage.options,
        ]);

        return Promise.resolve();
      });
  });

  it('Should fail with known error when the message is nacked', () => {
    const publishSpy = sandbox.spy((exchange, queue, message, options, confirmCallback) => {
      confirmCallback(new Error('message nacked'));
    });

    return testConnector.sendMessageToMQ(Object.assign(
      {},
      fixtures.publishMessage,
      {
        ch: {
          publish: publishSpy,
        },
      }
    ))
      .should.be.rejected
      .then((response) => {
        expect(response).to.have.property('name', 'MQ_PUBLISH_MESSAGE_ERROR_NACK');
        expect(publishSpy.callCount).to.be.equal(1);
        expect(publishSpy.getCall(0).args.slice(0, 4)).to.be.eql([
          fixtures.publishMessage.exchange,
          fixtures.publishMessage.queue,
          fixtures.publishMessage.message,
          fixtures.publishMessage.options,
        ]);

        return Promise.resolve();
      });
  });

  it(
    'Should resolve if message is accepted for delivery',
    () => testConnector.sendMessageToMQ(Object.assign(
      {},
      fixtures.publishMessage,
      {
        ch: {
          publish: fixtures.amqpChannel.publish,
        },
      }
    ))
      .should.be.fulfilled
      .then(() => Promise.resolve())
  );
});
