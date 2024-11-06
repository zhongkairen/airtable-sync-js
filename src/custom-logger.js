// custom-logger.js
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __relativePath = (metaUrl) => {
  const baseDir = process.cwd();
  const absolutePath = fileURLToPath(metaUrl);
  const relativePath = path.relative(baseDir, absolutePath);
  return path.relative(baseDir, absolutePath);
};

class CustomLogger {
  static globalLogLevel = 'info'; // Default log level
  static instances = [];

  static setLogLevel(logLevel) {
    CustomLogger.globalLogLevel = logLevel;
    CustomLogger.instances.forEach((instance) => instance.updateSilentMode());
  }

  constructor(filePath) {
    const filename = __relativePath(filePath);
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
    this.updateSilentMode();

    CustomLogger.instances.push(this);
  }

  updateSilentMode() {
    const isSilent = CustomLogger.globalLogLevel === 'silent';
    this.logger.transports.forEach((t) => (t.silent = isSilent));
  }

  info(message, ...args) {
    this.logger.info(message, ...args);
  }

  debug(message, ...args) {
    this.logger.debug(message, ...args);
  }

  warn(message, ...args) {
    this.logger.warn(message, ...args);
  }

  verbose(message, ...args) {
    this.logger.verbose(message, ...args);
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
