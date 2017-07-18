'use strict';

const testUtilities = require('@itavy/test-utilities');
const connLib = require('../../lib/v6x');
const fixtures = require('./Fixtures');

const expect = testUtilities.getExpect();

describe('Close', () => {
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

  it('Should resolve if there is no connection', () => testConnector.close()
      .should.be.fulfilled);

  it('Should close connection if it is open', () => {
    const closeSpy = sandbox.spy(fixtures.amqpConnection, 'close');

    return testConnector.connect()
      .then(() => testConnector.close())
      .should.be.fulfilled
      .then(() => {
        expect(closeSpy.callCount).to.be.equal(1);
        expect(testConnector.connection).to.be.equal(null);
        return Promise.resolve();
      });
  });
});
