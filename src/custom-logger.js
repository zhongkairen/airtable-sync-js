// custom-logger.js
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __relativePath = (metaUrl) => {
  const baseDir = process.cwd();
  const absolutePath = fileURLToPath(metaUrl);
  return path.relative(baseDir, absolutePath);
};

class CustomLogger {
  static globalLogLevel = 'info'; // Default log level
  static timer = null;

  static instances = [];

  /**
   * Set the global log level for all loggers.
   * Verbosity order: debug > verbose > info > warn > error > silent
   * @param {string} logLevel - possible values: 'debug', 'verbose', 'info', 'warn', 'error', 'silent'
   */
  static setLogLevel(logLevel) {
    CustomLogger.globalLogLevel = logLevel;
    CustomLogger.instances.forEach((instance) => {
      instance.logger.level = logLevel;
      instance.updateSilentMode();
    });
  }

  constructor(filePath) {
    const filename = __relativePath(filePath);

    this.logger = winston.createLogger({
      level: CustomLogger.globalLogLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf((info) => {
          const { lineno } = info.callerInfo || { lineno: 'unknown' };
          return `${info.timestamp} ${info.level}: [${filename}:${lineno}] ${info.message}`;
        })
      ),
      transports: [new winston.transports.Console()],
    });
    this.updateSilentMode();
    CustomLogger.instances.push(this);
  }

  updateSilentMode() {
    const isSilent = CustomLogger.globalLogLevel === 'silent';
    this.logger.transports.forEach((t) => (t.silent = isSilent));
  }

  logWithCallerInfo(level, message, ...args) {
    // Capture caller information each time a log method is invoked
    const callerInfo = this.getCallerInfo();

    // Log with caller info attached
    this.logger.log({
      level,
      message,
      callerInfo,
      ...args,
    });
  }

  info(message, ...args) {
    this.logWithCallerInfo('info', message, ...args);
  }

  debug(message, ...args) {
    this.logWithCallerInfo('debug', message, ...args);
  }

  warn(message, ...args) {
    this.logWithCallerInfo('warn', message, ...args);
  }

  verbose(message, ...args) {
    this.logWithCallerInfo('verbose', message, ...args);
  }

  error(message, ...args) {
    this.logWithCallerInfo('error', message, ...args);
  }

  getCallerInfo() {
    const stack = new Error().stack.split('\n');

    // Skip the frames related to internal logger functions
    let callerLine;
    for (let i = 2; i < stack.length; i++) {
      if (!stack[i].includes('CustomLogger') && !stack[i].includes('winston')) {
        callerLine = stack[i];
        break;
      }
    }

    const match =
      callerLine && callerLine.match(/at\s+(?:[^(]+)?\s*\(?file:\/\/\/(.+?):(\d+):\d+\)?/);

    if (match) {
      const lineno = match[2];
      return { lineno };
    }

    return { lineno: 'unknown' };
  }
}

export { CustomLogger };
