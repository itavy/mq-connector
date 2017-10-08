'use strict';

const testUtilities = require('@itavy/test-utilities');
const connLib = require('../../lib/v6x');
const fixtures = require('./Fixtures');

const expect = testUtilities.getExpect();

describe('ParseSubscribeOptions', () => {
  let sandbox;
  let testConnector;

  beforeEach((done) => {
    sandbox = testUtilities.getSinonSandbox();
    testConnector = connLib.getConnector(connLib.types.RABBIT_MQ, Object.assign(
      {},
      fixtures.rabbitmqConnOptions,
      {
        amqplib: fixtures.amqpLib
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
      expect(response).to.have.property('name', 'MQ_PARSE_SUBSCRIBE_OPTIONS_ERROR');
      expect(response).to.have.property('severity', 'WARNING');
      expect(response.cause.name.indexOf('AssertionError')).to.not.be.equal(-1);

      return Promise.resolve();
    }));

  it(
    'Should reject for missing required parameters - no topic',
    () => testConnector.parseSubscribeOptions(fixtures.badMessageOnTopic)
      .should.be.rejected
      .then((response) => {
        expect(response).to.have.property('name', 'MQ_PARSE_SUBSCRIBE_OPTIONS_ERROR');
        expect(response).to.have.property('severity', 'WARNING');
        expect(response.cause.name.indexOf('AssertionError')).to.not.be.equal(-1);

        return Promise.resolve();
      })
  );

  it('Should reject with fatal error', () => {
    sandbox.stub(fixtures.amqpChannel, 'checkExchange').rejects(fixtures.testingError);

    return testConnector.parseSubscribeOptions(Object.assign({}, fixtures.messageOnTopic, {
      ch: fixtures.amqpChannel
    }))
      .should.be.rejected
      .then((response) => {
        fixtures.testExpectedError({
          error: response,
          name:  'MQ_PARSE_SUBSCRIBE_OPTIONS_ERROR'
        });
        expect(response).to.have.property('severity', 'FATAL');
        return Promise.resolve();
      });
  });

  it(
    'Should resolve with provided queue and options',
    () => testConnector.parseSubscribeOptions(Object.assign({}, fixtures.subscribeQueueRequest, {
      ch: fixtures.amqpChannel
    }))
      .should.be.fulfilled
      .then((response) => {
        expect(response).to.have.property('queue', fixtures.subscribeQueueRequest.queue);
        expect(response.options).to.have.property('prefetch', fixtures.subscribeQueueRequest.options.prefetch);

        return Promise.resolve();
      })
  );

  it(
    'Should resolve with generated queue and default options',
    () => testConnector.parseSubscribeOptions(Object.assign({}, fixtures.subscribeTopicRequest, {
      ch: fixtures.amqpChannel
    }))
      .should.be.fulfilled
      .then((response) => {
        expect(response).to.have.property('queue', fixtures.generatedQueue);
        expect(response.options).to.have.property('prefetch', false);

        return Promise.resolve();
      })
  );
});
