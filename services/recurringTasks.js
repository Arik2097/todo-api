const cron = require('node-cron');
const Task = require('../models/Task');
const logger = require('../config/logger');

class RecurringTasksService {
    constructor() {
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) return;
        
        this.job = cron.schedule('* * * * *', async () => {
            await this.processRecurringTasks();
        });
        
        this.isRunning = true;
        logger.info('🔄 Recurring Tasks Scheduler started');
    }

    stop() {
        if (this.job) {
            this.job.stop();
            this.isRunning = false;
            logger.info('⏹️ Recurring Tasks Scheduler stopped');
        }
    }

    async processRecurringTasks() {
        try {
            const now = new Date();
            
            const dueTasks = await Task.find({
                isRecurring: true,
                nextDueDate: { $lte: now }
            });

            for (const task of dueTasks) {
                await this.createNextRecurrence(task);
            }

        } catch (error) {
            logger.error('Error processing recurring tasks:', error);
        }
    }

    async createNextRecurrence(parentTask) {
        try {
            const newTask = new Task({
                title: parentTask.title,
                description: parentTask.description,
                priority: parentTask.priority,
                userId: parentTask.userId,
                parentTaskId: parentTask._id,
                isRecurring: false
            });

            await newTask.save();

            parentTask.nextDueDate = this.calculateNextDueDate(parentTask);
            await parentTask.save();

            logger.info(`Created recurring task: ${newTask.title} for user: ${newTask.userId}`);

        } catch (error) {
            logger.error('Error creating recurring task:', error);
        }
    }

    calculateNextDueDate(task) {
        const now = new Date();
        const pattern = task.recurringPattern;
        const [hours, minutes] = pattern.time.split(':').map(Number);

        let nextDate = new Date();
        nextDate.setHours(hours, minutes, 0, 0);

        switch (pattern.frequency) {
            case 'daily':
                if (nextDate <= now) {
                    nextDate.setDate(nextDate.getDate() + 1);
                }
                break;

            case 'weekly':
                const targetDay = pattern.dayOfWeek;
                const currentDay = nextDate.getDay();
                let daysToAdd = targetDay - currentDay;
                
                if (daysToAdd <= 0 || (daysToAdd === 0 && nextDate <= now)) {
                    daysToAdd += 7; 
                }
                
                nextDate.setDate(nextDate.getDate() + daysToAdd);
                break;

            case 'monthly':
                nextDate.setDate(pattern.dayOfMonth);
                
                if (nextDate <= now) {
                    nextDate.setMonth(nextDate.getMonth() + 1);
                }
                break;
        }

        return nextDate;
    }

    async createRecurringTask(taskData, userId) {
        try {
            const task = new Task({
                ...taskData,
                userId,
                isRecurring: true,
                nextDueDate: this.calculateNextDueDate({
                    recurringPattern: taskData.recurringPattern
                })
            });

            await task.save();
            logger.info(`Created new recurring task: ${task.title}`);
            return task;

        } catch (error) {
            logger.error('Error creating recurring task:', error);
            throw error;
        }
    }
}

module.exports = new RecurringTasksService();