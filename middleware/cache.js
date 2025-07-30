const redisService = require('../config/redis');
const logger = require('../config/logger');

const cacheGet = (keyGenerator) => {
    return async (req, res, next) => {
        try {
            const cacheKey = keyGenerator(req);
            
            const cachedData = await redisService.get(cacheKey);
            
            if (cachedData) {
                logger.info(`Cache HIT for key: ${cacheKey}`);
                return res.json(cachedData);
            }
            
            logger.info(`Cache MISS for key: ${cacheKey}`);
            
            req.cacheKey = cacheKey;
            next();
            
        } catch (error) {
            logger.error('Cache middleware error:', error);
            next(); 
        }
    };
};

const cacheSet = async (key, data, expireInSeconds = 300) => {
    try {
        await redisService.set(key, data, expireInSeconds);
        logger.info(`Data cached for key: ${key}`);
    } catch (error) {
        logger.error('Cache set error:', error);
    }
};

const cacheDelete = async (pattern) => {
    try {
        await redisService.del(pattern);
        logger.info(`Cache deleted for pattern: ${pattern}`);
    } catch (error) {
        logger.error('Cache delete error:', error);
    }
};

module.exports = {
    cacheGet,
    cacheSet,
    cacheDelete
};