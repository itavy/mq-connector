'use strict';

const { expect, getSinonSandbox } = require('@itavy/test-utilities');
const connLib = require('../../');
const fixtures = require('./Fixtures');


describe('Unsubscribe', () => {
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

  it('Should unsubscribe from provided queue', () => {
    const unsubscribeSpy = sandbox.spy(fixtures.amqpChannel, 'cancel');
    return testConnector.subscribe(fixtures.subscribeQueueRequest)
      .should.be.fulfilled
      .then((response) => {
        testConnector.unsubscribe({ consumerTag: response.consumerTag })
          .should.be.fulfilled
          .then((result) => {
            expect(unsubscribeSpy.callCount).to.be.equal(1);
            expect(result.consumerTag).to.be.equal(response.consumerTag);
            return Promise.resolve();
          });
      });
  });


  it('Should fail unsubscription on bogus tag', () => {
    sandbox.stub(fixtures.amqpChannel, 'cancel').throws(new Error(''));
    testConnector.unsubscribe({ consumerTag: 'whateverTag' })
      .should.be.rejected
      .then((error) => {
        expect(error.name).to.be.eql('MQ_UNSUBSCRIBE_ERROR');
      });
  });
});
