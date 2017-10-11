'use strict';

const { expect } = require('@itavy/test-utilities');
const connLib = require('../../lib/v6x');
const fixtures = require('./Fixtures');

describe('Initializaton', () => {
  it('Should export a well defined object', (done) => {
    const testConn = connLib.getConnector(connLib.types.RABBIT_MQ, fixtures.rabbitmqConnOptions);
    expect(testConn).to.have.property('debug');
    expect(testConn).to.have.property('sourceIdentifier');
    expect(testConn).to.have.property('rejectWithError');
    expect(testConn).to.have.property('connection', null);
    expect(testConn).to.have.property('publishChannel', null);
    expect(testConn).to.have.property('subscribeChannel', null);
    expect(testConn).to.have.property('subscribeQueueOptions');
    expect(testConn).to.have.property('amqplib');
    expect(testConn).to.have.property('rmqEvents');
    expect(testConn).to.have.property('promiseOnEvent');
    expect(testConn).to.have.property('mqURI', fixtures.rabbitmqConnOptions.mqURI);

    done();
  });
});
