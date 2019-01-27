'use strict';

const { expect, getSinonSandbox } = require('@itavy/test-utilities');
const connLib = require('../../');
const fixtures = require('./Fixtures');


describe('ParseSubscribeOptions', () => {
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

  it('Should reject for missing required parameters', () => testConnector.parseSubscribeOptions({})
    .should.be.rejected
    .then((response) => {
      // expect(response).to.have.property('name', 'AssertionError [ERR_ASSERTION]');
      expect(response).to.have.property('name');
      expect(response.name.startsWith('AssertionError')).to.be.equal(true);
      return Promise.resolve();
    }));

  it('Should reject for missing required parameters - no topic', () => testConnector
    .parseSubscribeOptions(fixtures.badMessageOnTopic)
    .should.be.rejected
    .then((response) => {
      // expect(response).to.have.property('name', 'AssertionError [ERR_ASSERTION]');
      expect(response).to.have.property('name');
      expect(response.name.startsWith('AssertionError')).to.be.equal(true);

      return Promise.resolve();
    }));

  it('Should reject for invalid exchange', () => {
    sandbox.stub(fixtures.amqpChannel, 'checkExchange').rejects(fixtures.testingError);

    return testConnector.parseSubscribeOptions(Object.assign(
      {},
      fixtures.messageOnTopic,
      {
        ch: fixtures.amqpChannel,
      }
    ))
      .should.be.rejected
      .then((response) => {
        expect(response).to.be.eql(fixtures.testingError);

        return Promise.resolve();
      });
  });

  it(
    'Should resolve with provided queue and options',
    () => testConnector.parseSubscribeOptions(Object.assign(
      {},
      fixtures.subscribeQueueRequest,
      {
        ch: fixtures.amqpChannel,
      }
    ))
      .should.be.fulfilled
      .then((response) => {
        expect(response).to.have.property('queue', fixtures.subscribeQueueRequest.queue);
        expect(response.options).to.have.property('prefetch', fixtures.subscribeQueueRequest.options.prefetch);

        return Promise.resolve();
      })
  );

  it(
    'Should resolve with generated queue and default options',
    () => testConnector.parseSubscribeOptions(Object.assign(
      {},
      fixtures.subscribeTopicRequest,
      {
        ch: fixtures.amqpChannel,
      }
    ))
      .should.be.fulfilled
      .then((response) => {
        expect(response).to.have.property('queue', fixtures.generatedQueue);
        expect(response.options).to.have.property('prefetch', false);

        return Promise.resolve();
      })
  );
});
