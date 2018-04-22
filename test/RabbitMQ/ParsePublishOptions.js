'use strict';

const { expect } = require('@itavy/test-utilities');
const connLib = require('../../');
const fixtures = require('./Fixtures');


describe('ParsePublishOptions', () => {
  let testConnector;

  beforeEach((done) => {
    testConnector = connLib.getConnector(connLib.types.RABBIT_MQ, {
      ...fixtures.rabbitmqConnOptions,
      amqplib: fixtures.amqpLib,
    });
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
