'use strict';

const { expect, getSinonSandbox } = require('@itavy/test-utilities');
const connLib = require('../../');
const fixtures = require('./Fixtures');


describe('SendMessageToMQ', () => {
  let sandbox;
  let testConnector;

  beforeEach((done) => {
    sandbox = getSinonSandbox();
    testConnector = connLib.getConnector(connLib.types.RABBIT_MQ, {
      ...fixtures.rabbitmqConnOptions,
      amqplib: fixtures.amqpLib,
    });
    return done();
  });

  afterEach((done) => {
    sandbox.restore();
    testConnector = null;
    done();
  });

  it('Should fail with known error', () => {
    const publishStub = sandbox.stub().returns(false);

    return testConnector.sendMessageToMQ({
      ...fixtures.publishMessage,
      ch: {
        publish: publishStub,
      },
    })
      .should.be.rejected
      .then((response) => {
        expect(response).to.have.property('name', 'MQ_PUBLISH_MESSAGE_ERROR');
        expect(publishStub.callCount).to.be.equal(1);
        expect(publishStub.getCall(0).args).to.be.eql([
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
    () => testConnector.sendMessageToMQ({
      ...fixtures.publishMessage,
      ch: {
        publish: () => true,
      },
    })
      .should.be.fulfilled
      .then(() => Promise.resolve())
  );
});
