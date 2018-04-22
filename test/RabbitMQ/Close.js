'use strict';

const { expect, getSinonSandbox } = require('@itavy/test-utilities');
const connLib = require('../../');
const fixtures = require('./Fixtures');


describe('Close', () => {
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
    done();
  });

  afterEach((done) => {
    sandbox.restore();
    testConnector = null;
    done();
  });

  it('Should resolve if there is no connection', () => testConnector.close()
    .should.be.fulfilled);

  it('Should close subscribe and publish channels before closing', () => {
    const closeStub = sandbox.stub(testConnector, 'closeChannel')
      .onCall(0)
      .resolves()
      .onCall(1)
      .rejects(fixtures.testingError);

    return testConnector.getConnection()
      .then(() => testConnector.close()
        .should.be.rejected
        .then((response) => {
          expect(response).to.be.equal(fixtures.testingError);
          expect(closeStub.callCount).to.be.equal(2);
          expect(closeStub.getCall(0).args[0])
            .to.be.eql(fixtures.closeChannelOptions.publish);
          expect(closeStub.getCall(1).args[0])
            .to.be.eql(fixtures.closeChannelOptions.subscribe);
          expect(testConnector.connectionFlags.closing).to.be.equal(true);
          return Promise.resolve();
        }));
  });

  it('Should close connection', () => {
    const closeStub = sandbox.stub(fixtures.amqpConnection, 'close').rejects(fixtures.testingError);

    return testConnector.getConnection()
      .then(() => testConnector.close()
        .should.be.rejected
        .then((response) => {
          expect(response).to.be.equal(fixtures.testingError);
          expect(closeStub.callCount).to.be.equal(1);
          expect(testConnector.connectionFlags.closing).to.be.equal(true);
          return Promise.resolve();
        }));
  });

  it('Should emit close connection event', () => {
    const closeSpy = sandbox.spy();

    testConnector.rmqEvents.on('closeConnection', closeSpy);

    return testConnector.getConnection()
      .then(() => testConnector.close()
        .should.be.fulfilled
        .then(() => {
          expect(closeSpy.callCount).to.be.equal(1);
          expect(testConnector.connection).to.be.equal(null);
          expect(testConnector.connectionFlags.closing).to.be.equal(false);
          return Promise.resolve();
        }));
  });


  it('Should resolve pending close connection', () => {
    const closeSpy = sandbox.spy();

    testConnector.rmqEvents.on('closeConnection', closeSpy);

    return testConnector.getConnection()
      .then(() => {
        testConnector.close();
        return testConnector.close()
          .should.be.fulfilled
          .then(() => {
            expect(closeSpy.callCount).to.be.equal(1);
            expect(testConnector.connection).to.be.equal(null);
            expect(testConnector.connectionFlags.closing).to.be.equal(false);
            return Promise.resolve();
          });
      });
  });
});
