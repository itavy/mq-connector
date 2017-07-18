'use strict';

const expect = require('@itavy/test-utilities').getExpect();
const connLib = require('../../../lib/v6x');
const fixtures = require('./Fixtures');


describe('Conecting', () => {
  it('Should fail for incorect credentials', () => {
    const testConnector = connLib.getConnector(connLib.types.RABBIT_MQ, {
      mqURI: fixtures.noAccessUri,
    });

    return testConnector.connect()
      .should.be.rejected
      .then((err) => {
        expect(err).to.have.property('name', 'MQ_CONNECT_ERROR');
        return Promise.resolve();
      });
  });

  it('Should connect', () => {
    const testConnector = connLib.getConnector(connLib.types.RABBIT_MQ, {
      mqURI: fixtures.mqUri,
    });

    return testConnector.connect()
      .should.be.fulfilled
      .then(() => testConnector.close())
      .then(() => Promise.resolve());
  });
});
