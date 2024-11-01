// custom-logger.js
import winston from 'winston';
import path from 'path';

class CustomLogger {
  static globalLogLevel = 'info'; // Default log level

  static setLogLevel(logLevel) {
    CustomLogger.globalLogLevel = logLevel;
  }

  constructor(filePath) {
    const filename = path.basename(filePath);
    this.logger = winston.createLogger({
      level: CustomLogger.globalLogLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf((info) => {
          const callerInfo = this.getCallerInfo();
          return `${info.timestamp} ${info.level}: [${filename}:${callerInfo.lineno}] ${info.message}`;
        })
      ),
      transports: [new winston.transports.Console()],
    });
  }

  info(message, ...args) {
    this.logger.info(message, ...args);
  }

  debug(message, ...args) {
    this.logger.debug(message, ...args);
  }

  error(message, ...args) {
    this.logger.error(message, ...args);
  }

  getCallerInfo() {
    const stack = new Error().stack;
    const lines = stack.split('\n');
    const callerLine = lines[3] || lines[2];

    const match = callerLine.match(/at (.+) \((.+):(\d+):\d+\)|at (.+) (.+):(\d+):\d+/);
    if (match) {
      const lineno = match[3] || match[6];
      return { lineno };
    }

    return { lineno: 'unknown' };
  }
}

export { CustomLogger };
