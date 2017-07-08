'use strict';

const testUtilities = require('@itavy/test-utilities');
const connLib = require('../../lib/v6x');
const fixtures = require('./Fixtures');

const expect = testUtilities.getExpect();

describe('SendMessage', () => {
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
    const parseStub = sandbox.stub(testConnector, 'parsePublishOptions')
      .rejects(fixtures.testingError);

    return testConnector.sendMessage(fixtures.publishMessage)
      .should.be.rejected
      .then((response) => {
        fixtures.testExpectedError({
          error: response,
          name:  'MQ_SEND_MESSAGE_ERROR',
        });
        expect(parseStub.callCount).to.be.equal(1);
        expect(parseStub.getCall(0).args[0]).to.be.equal(fixtures.publishMessage.options);

        return Promise.resolve();
      });
  });

  it('Should send provided message', () => {
    const sendSpy = sandbox.spy(testConnector.publishChannel, 'publish');

    return testConnector.sendMessage(fixtures.publishMessage)
      .should.be.fulfilled
      .then(() => {
        expect(sendSpy.callCount).to.be.equal(1);
        expect(sendSpy.getCall(0).args).to.be.eql([
          fixtures.publishMessage.exchange,
          fixtures.publishMessage.queue,
          fixtures.publishMessage.message,
          fixtures.publishMessage.options,
        ]);

        return Promise.resolve();
      });
  });
});
