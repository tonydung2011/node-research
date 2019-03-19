const winston = require('winston');
const FluentTransport = require('fluent-logger').support.winstonTransport();
const { env } = require('../../config/vars');

let logger;
const config = {
  host: 'fluentd',
  port: 24224,
  timeout: 3.0,
  requireAckResponse: true
};

if (env === 'development') {
  logger = winston.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.simple(),
      }),
    ],
  });
} else {
  logger = winston.createLogger({
    transports: [
      new FluentTransport('mytag', config),
    ],
  });
  logger.on('logging', (transport, level, message, meta) => {
    if (meta.end && transport.sender && transport.sender.end) {
      transport.sender.end();
    }
  });
}

module.exports = logger;
