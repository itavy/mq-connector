'use strict';

const testUtilities = require('@itavy/test-utilities');
const connLib = require('../../lib/v6x');
const fixtures = require('./Fixtures');

const expect = testUtilities.getExpect();

describe('CheckExchange', () => {
  let sandbox;
  let testConnector;

  beforeEach((done) => {
    sandbox = testUtilities.getSinonSandbox();
    testConnector = connLib.getConnector(connLib.types.RABBIT_MQ, Object.assign({},
      fixtures.rabbitmqConnOptions,
      {
        amqplib: fixtures.amqpLib,
      }));
    return done();
  });

  afterEach((done) => {
    sandbox.restore();
    testConnector = null;
    done();
  });

  it('Should resolve if exchange exists', () => {
    const checkExchangeStub = sandbox.spy(fixtures.amqpChannel, 'checkExchange');

    return testConnector.checkExchange({
      channel:  fixtures.amqpChannel,
      exchange: fixtures.messageOnTopic.exchange,
    })
      .should.be.fulfilled
      .then(() => {
        expect(checkExchangeStub.callCount).to.be.equal(1);
        expect(checkExchangeStub.getCall(0).args[0]).to.be.equal(fixtures.messageOnTopic.exchange);

        return Promise.resolve();
      });
  });

  it('Should fail with expected error if exchange does not exists', () => {
    sandbox.stub(fixtures.amqpChannel, 'checkExchange').rejects(fixtures.testingError);

    return testConnector.checkExchange({
      channel:  fixtures.amqpChannel,
      exchange: fixtures.messageOnTopic.exchange,
    })
      .should.be.rejected
      .then((response) => {
        fixtures.testExpectedError({
          error: response,
          name:  'MQ_CHECK_EXCHANGE_ERROR',
        });
        expect(response).to.have.property('severity', 'FATAL');

        return Promise.resolve();
      });
  });
});
