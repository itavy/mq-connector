'use strict';

const expect = require('@itavy/test-utilities').getExpect();
const connLib = require('../../../lib/v6x');
const fixtures = require('./Fixtures');

describe('Queues', () => {
  it('Should receive message', (done) => {
    const receiver = connLib.getConnector(connLib.types.RABBIT_MQ, {
      mqURI: fixtures.mqUri,
    });
    const sender = connLib.getConnector(connLib.types.RABBIT_MQ, {
      mqURI: fixtures.mqUri,
    });

    const messageToSend = `test message - ${Date.now()}`;

    // eslint-disable-next-line require-jsdoc
    const closeConn = () => receiver.close()
      .then(() => sender.close());


    receiver.connect()
      .then(() => receiver.subscribe({
        consumer: (connMessage) => {
          connMessage.ack()
            .then(() => closeConn())
            .then(() => {
              const receivedMessage = connMessage.message.toString();
              expect(receivedMessage).to.be.equal(messageToSend);
              return Promise.resolve();
            })
            .then(() => done())
            .catch(err => closeConn()
              .then(() => done(err)));
        },
        queue: fixtures.workQueues[2],
      }))
      .then(() => sender.connect())
      .then(() => sender.sendMessage({
        message: Buffer.from(messageToSend),
        queue:   fixtures.workQueues[2],
      }))

      .catch(err => closeConn()
        .then(() => done(err)));
  });

  it('Each subscriber should receive one message', (done) => {
    const receiver1 = connLib.getConnector(connLib.types.RABBIT_MQ, {
      mqURI: fixtures.mqUri,
    });
    const receiver2 = connLib.getConnector(connLib.types.RABBIT_MQ, {
      mqURI: fixtures.mqUri,
    });
    const sender = connLib.getConnector(connLib.types.RABBIT_MQ, {
      mqURI: fixtures.mqUri,
    });

    // eslint-disable-next-line require-jsdoc
    const closeConn = () => receiver1.close()
      .then(() => receiver2.close())
      .then(() => sender.close());

    const messageToSend = `test message - ${Date.now()}`;
    const received = {
      r1: null,
      r2: null,
    };

    // eslint-disable-next-line require-jsdoc
    const receive = ({ receiverId }) => {
      if (received[receiverId] !== null) {
        done('Same receiver twice!');
      }
      received[receiverId] = '';
      if ((received.r1 !== null) && (received.r2 !== null)) {
        closeConn()
          .then(() => done());
      }
    };


    receiver1.connect()
      .then(() => receiver1.subscribe({
        consumer: (connMessage) => {
          receive({
            receiverId: 'r1',
          });
          connMessage.ack();
        },
        queue: fixtures.workQueues[1],
      }))
      .then(() => receiver2.connect())
      .then(() => receiver2.subscribe({
        consumer: (connMessage) => {
          receive({
            receiverId: 'r2',
          });
          connMessage.ack();
        },
        queue: fixtures.workQueues[1],
      }))

      .then(() => sender.connect())
      .then(() => sender.sendMessage({
        message: Buffer.from(messageToSend),
        queue:   fixtures.workQueues[1],
      }))
      .then(() => sender.sendMessage({
        message: Buffer.from(messageToSend),
        queue:   fixtures.workQueues[1],
      }))

      .catch(err => closeConn()
        .then(() => done(err)));
  });
});
