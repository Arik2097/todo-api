const logger = require('../config/logger');

const requestLogger = (req,res, next) => {
    const startTime = Date.now();

    logger.info(`${req.method} ${req.originalUrl} - IP: ${req.ip} - User: ${req.user ? req.user.email : 'Anonymous'}`);

    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const statusColor = res.statusCode >= 400 ? 'error' : 'info';
        
        logger[statusColor](`${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Duration: ${duration}ms`);
    });
    
    next();

};

module.exports = requestLogger;
