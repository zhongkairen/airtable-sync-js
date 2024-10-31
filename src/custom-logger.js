// import * as winston from 'winston';
import winston from 'winston';
import * as path from 'path';

export class CustomLogger {
    static VERBOSE = 15; // Custom verbose level

    constructor(name) {
        this.logger = winston.createLogger({
            level: 'info', // Default level
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf((info) => {
                    return `${info.timestamp} ${info.level}: ${info.message}`;
                })
            ),
            transports: [
                new winston.transports.Console()
            ]
        });

        // Add the custom level if not already defined
        winston.addColors({ verbose: 'cyan' });
    }

    verbose(message, ...args) {
        this._logWithCallerInfo(CustomLogger.VERBOSE, message, ...args);
    }

    info(message, ...args) {
        this._logWithCallerInfo('info', message, ...args);
    }

    debug(message, ...args) {
        this._logWithCallerInfo('debug', message, ...args);
    }

    warning(message, ...args) {
        this._logWithCallerInfo('warn', message, ...args);
    }

    error(message, ...args) {
        this._logWithCallerInfo('error', message, ...args);
    }

    _logWithCallerInfo(level, message, ...args) {
        const stack = new Error().stack;
        if (!stack) return;

        const callerLine = stack.split('\n')[3]; // Get the third line (caller)
        const match = callerLine.match(/at (.+) \((.+):(\d+):(\d+)\)/); // Extract function name, file name, and line number

        if (match) {
            const methodName = match[1].trim();
            const filename = path.basename(match[2]);
            const lineno = match[3];

            // Log the message with the correct filename and line number
            const logMessage = `${filename}:${lineno} - ${methodName}() - ${message}`;
            this.logger.log(level, logMessage, ...args);
        }
    }

    static setupLogging(level) {
        const logLevels = {
            debug: 'debug',
            verbose: 'verbose',
            info: 'info',
            warning: 'warn',
            error: 'error'
        };
        const mappedLevel = logLevels[level] || 'error';

        winston.configure({
            level: mappedLevel,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf((info) => {
                    return `${info.timestamp} ${info.level}: ${info.message}`;
                })
            ),
            transports: [
                new winston.transports.Console()
            ]
        });
    }
}
