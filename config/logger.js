const winston = require('winston');

const colors = {
    error: 'red',
    warn: 'yellow', 
    info: 'green',
    debug: 'blue'
};

winston.addColors(colors);

const logFormat = winston.format.combine(
    winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
    winston.format.colorize({all:true}),
    winston.format.printf(info =>
        `${info.timestamp} [${info.level}]: ${info.message}`
    )
);

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
    new winston.transports.Console(),
    
    new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error'
    }),

    new winston.transports.File({
        filename: 'logs/combine.log'
    })
    ]
});

module.exports = logger;