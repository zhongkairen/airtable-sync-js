import * as winston from 'winston';
import * as path from 'path';

export class CustomLogger {
    private static readonly VERBOSE: number = 15; // Custom verbose level
    private logger: winston.Logger;

    constructor(name: string) {
        this.logger = winston.createLogger({
            level: 'info', // Default level
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf(({ timestamp, level, message }) => {
                    return `${timestamp} ${level}: ${message}`;
                })
            ),
            transports: [
                new winston.transports.Console()
            ]
        });

        // Add the custom level if not already defined
        winston.addColors({ verbose: 'cyan' });
    }

    public verbose(message: string, ...args: any[]): void {
        this._logWithCallerInfo(CustomLogger.VERBOSE, message, ...args);
    }

    public info(message: string, ...args: any[]): void {
        this._logWithCallerInfo('info', message, ...args);
    }

    public debug(message: string, ...args: any[]): void {
        this._logWithCallerInfo('debug', message, ...args);
    }

    public warning(message: string, ...args: any[]): void {
        this._logWithCallerInfo('warn', message, ...args);
    }

    public error(message: string, ...args: any[]): void {
        this._logWithCallerInfo('error', message, ...args);
    }

    private _logWithCallerInfo(level: any, message: string, ...args: any[]): void {
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

    public static setupLogging(level: string): void {
        const logLevels: { [key: string]: string } = {
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
                winston.format.printf(({ timestamp, level, message }) => {
                    return `${timestamp} ${level}: ${message}`;
                })
            ),
            transports: [
                new winston.transports.Console()
            ]
        });
    }
}