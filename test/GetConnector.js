'use strict';

const { expect } = require('@itavy/test-utilities');
const connLib = require('../lib/v6x');


describe('getConnector', () => {
  it('Should fail for unknown connector', (done) => {
    const connectorType = Symbol('testingConnector');
    const expectedError = `Unknown MQ Connector type ${connectorType.toString()}`;
    // eslint-disable-next-line require-jsdoc
    const shouldThrow = () => connLib.getConnector(connectorType, {});
    expect(shouldThrow).to.throw(expectedError);

    return done();
  });
});
