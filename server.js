const app = require('./app');
const redisService = require('./config/redis');
const recurringTasksService = require('./services/recurringTasks');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/todoapp')
    .then(async () => { // ← async כאן!
        console.log('✅ MongoDB Connected');

        await redisService.connect();

        recurringTasksService.start();

        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });

    })
    .catch(err => {
        console.error('❌ Database connection failed:', err);
        process.exit(1);
    });
