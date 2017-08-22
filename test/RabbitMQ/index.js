'use strict';

describe('RabbitMQ Connector', () => {
  require('./Initialization'); // eslint-disable-line global-require
  require('./Connect'); // eslint-disable-line global-require
  require('./GetConnection'); // eslint-disable-line global-require
  require('./CreateChannel'); // eslint-disable-line global-require
  require('./GetPublishChannel'); // eslint-disable-line global-require
  require('./Close'); // eslint-disable-line global-require
  require('./ParsePublishOptions'); // eslint-disable-line global-require
  require('./CheckExchange'); // eslint-disable-line global-require
  require('./BindQueue'); // eslint-disable-line global-require
  require('./CheckQueue'); // eslint-disable-line global-require
  require('./ParseSubscribeOptions'); // eslint-disable-line global-require
  require('./SubscribeToQueue'); // eslint-disable-line global-require
  require('./SendMessageToMQ'); // eslint-disable-line global-require
  require('./Subscribe'); // eslint-disable-line global-require
  require('./SendMessage'); // eslint-disable-line global-require
});
