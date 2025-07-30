const redis = require('redis');
const logger = require('./logger');

class RedisService {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            this.client = redis.createClient({
                host: 'localhost',
                port: 6379
            });

            this.client.on('error', (err) => {
                logger.error('Redis Client Error:', err);
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                logger.info('✅ Redis connected successfully');
                this.isConnected = true;
            });

            await this.client.connect();
            
        } catch (error) {
            logger.error('❌ Redis connection failed:', error.message);
            this.isConnected = false;
        }
    }

    async get(key) {
        if (!this.isConnected) return null;
        
        try {
            const result = await this.client.get(key);
            return result ? JSON.parse(result) : null;
        } catch (error) {
            logger.error('Redis GET error:', error);
            return null;
        }
    }

    async set(key, value, expireInSeconds = 300) {
        if (!this.isConnected) return false;
        
        try {
            await this.client.setEx(key, expireInSeconds, JSON.stringify(value));
            return true;
        } catch (error) {
            logger.error('Redis SET error:', error);
            return false;
        }
    }

    async del(key) {
        if (!this.isConnected) return false;
        
        try {
            await this.client.del(key);
            return true;
        } catch (error) {
            logger.error('Redis DEL error:', error);
            return false;
        }
    }

    async flush() {
        if (!this.isConnected) return false;
        
        try {
            await this.client.flushAll();
            return true;
        } catch (error) {
            logger.error('Redis FLUSH error:', error);
            return false;
        }
    }
}

module.exports = new RedisService();