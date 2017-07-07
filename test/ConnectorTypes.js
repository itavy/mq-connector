'use strict';

const expect = require('@itavy/test-utilities').getExpect();
const connLib = require('../lib/v6x');


describe('Connector types', () => {
  it('Should have required types', (done) => {
    expect(connLib.types).to.have.property('RABBIT_MQ');
    return done();
  });
});
