'use strict';

const testUtilities = require('@itavy/test-utilities');
const connLib = require('../../lib/v6x');
const fixtures = require('./Fixtures');

const expect = testUtilities.getExpect();

describe('Connect', () => {
  let testConnector;

  beforeEach((done) => {
    testConnector = connLib.getConnector(connLib.types.RABBIT_MQ, Object.assign({},
      fixtures.rabbitmqConnOptions,
      {
        amqplib: fixtures.amqpLib,
      }));
    done();
  });

  afterEach((done) => {
    testConnector = null;
    done();
  });

  it('Should resolve with an empty object', () => testConnector.parsePublishOptions({})
    .should.be.fulfilled
    .then((response) => {
      expect(response).to.be.eql({});
      return Promise.resolve();
    }));

  it('Should resolve specific key for rabbtmq expire', () => {
    const ttlExpire = 123456789;
    return testConnector.parsePublishOptions({ ttl: ttlExpire })
      .should.be.fulfilled
      .then((response) => {
        expect(response).to.be.eql({
          expiration: `${ttlExpire}000`,
        });
        return Promise.resolve();
      });
  });
});
