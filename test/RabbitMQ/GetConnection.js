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


  it('Should reject with specific error', () => {
    const connectFail =
      sandbox.stub(testConnector.amqplib, 'connect').rejects(fixtures.testingError);

    return testConnector.getConnection()
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

  it('Should emit specific event on success', () => {
    const createConnectionSpy = sandbox.spy();
    const createConnectionSpy2 = sandbox.spy();

    testConnector.rmqEvents.on('createdConnection', createConnectionSpy);
    testConnector.rmqEvents.on('createdConnection', createConnectionSpy2);

    return testConnector.getConnection()
      .should.be.fulfilled
      .then(() => {
        expect(testConnector).to.have.property('connection', fixtures.amqpConnection);
        expect(createConnectionSpy.callCount).to.be.equal(1);
        expect(createConnectionSpy2.callCount).to.be.equal(1);
        return Promise.resolve();
      });
  });

  it('Should return connection if it is allready defined', () => testConnector.getConnection()
    .then(() => {
      const createConnectionSpy = sandbox.spy();

      testConnector.rmqEvents.on('createdConnection', createConnectionSpy);
      return testConnector.getConnection()
        .should.be.fulfilled
        .then((response) => {
          expect(response).to.be.equal(fixtures.amqpConnection);
          expect(createConnectionSpy.callCount).to.be.equal(0);
          return Promise.resolve();
        });
    }));

  it('Should resolve with result connection while another request is pending', () => {
    const createConnectionSpy = sandbox.spy();

    testConnector.rmqEvents.on('createdConnection', createConnectionSpy);
    testConnector.getConnection();
    testConnector.getConnection()
      .should.be.fulfilled
      .then((response) => {
        expect(response).to.be.equal(fixtures.amqpConnection);
        expect(createConnectionSpy.callCount).to.be.equal(1);
        return Promise.resolve();
      });
  });
});
