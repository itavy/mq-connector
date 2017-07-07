'use strict';

const testUtilities = require('@itavy/test-utilities');
const connLib = require('../../lib/v6x');
const fixtures = require('./Fixtures');

const expect = testUtilities.getExpect();

describe('Connect', () => {
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

  it('Should call with conn details and fail with expected error', () => {
    const connectFail =
      sandbox.stub(testConnector.amqplib, 'connect').rejects(fixtures.testingError);

    return testConnector.connect()
      .should.be.rejected
      .then((response) => {
        fixtures.testExpectedError({
          error: response,
          name:  'MQ_CONNECT_ERROR',
        });
        expect(connectFail.callCount).to.be.equal(1);
        expect(connectFail.getCall(0).args[0]).to.be.equal(fixtures.rabbitmqConnOptions.mqURI);

        return Promise.resolve();
      });
  });

  it('Should connect and set channels', () => testConnector.connect()
    .should.be.fulfilled
    .then(() => {
      expect(testConnector).to.have.property('connection', fixtures.amqpConnection);
      expect(testConnector).to.have.property('publishChannel', fixtures.amqpChannel);
      expect(testConnector).to.have.property('subscribeChannel', fixtures.amqpChannel);

      return Promise.resolve();
    }));
});
