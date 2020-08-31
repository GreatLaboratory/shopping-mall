import { LoggerOptions, transports, createLogger, format } from 'winston';
const { combine, timestamp, prettyPrint } = format;

const options: LoggerOptions = {
    transports: [
        new transports.Console({
            level: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
        }),
        new transports.File({ filename: 'debug.log', level: 'debug' })
    ],
    format: combine(
        timestamp(),
        prettyPrint(),
    )
};

const logger = createLogger(options);

if (process.env.NODE_ENV !== 'production') {
    logger.debug('Logging initialized at debug level');
}

export default logger;
