const recurringTasksService = require('../services/recurringTasks'); 
const TaskShare = require('../models/TaskShare');
const permissionService = require('../utils/permissions'); 
const express = require('express');
const Task = require('../models/Task');
const auth = require('../middleware/auth');
const { cacheGet, cacheSet, cacheDelete } = require('../middleware/cache');
const router = express.Router();

router.get('/', 
    auth, 
    cacheGet((req) => `tasks:${req.user._id}`),
    async (req, res) => {
        try {
            const tasks = await Task.find({ userId: req.user._id });
            
            await cacheSet(req.cacheKey, tasks, 300);
            
            res.json(tasks);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);

router.get('/', 
    auth, 
    cacheGet((req) => `tasks:${req.user._id}`),
    async (req, res) => {
        try {
            const tasks = await permissionService.getUserVisibleTasks(req.user._id);
            
            const tasksWithPermissions = await Promise.all(
                tasks.map(async (task) => {
                    const viewResult = await permissionService.canView(req.user._id, task._id);
                    return {
                        ...task.toObject(),
                        userRole: viewResult.role,
                        canEdit: viewResult.role === 'owner' || viewResult.role === 'editor'
                    };
                })
            );
            
            await cacheSet(req.cacheKey, tasksWithPermissions, 300);
            res.json(tasksWithPermissions);
            
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);
router.put('/:id', auth, async (req, res) => {
    try {
        const taskId = req.params.id;
        
        const canEdit = await permissionService.canEdit(req.user._id, taskId);
        if (!canEdit) {
            return res.status(403).json({ 
                success: false,
                error: 'You do not have permission to edit this task' 
            });
        }
        
        const task = await Task.findByIdAndUpdate(
            taskId,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        await this.clearTaskCache(taskId);
        
        res.json(task);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.delete('/:id', auth, async (req, res) => {
    try {
        const taskId = req.params.id;
        
        const canDelete = await permissionService.canDelete(req.user._id, taskId);
        if (!canDelete) {
            return res.status(403).json({ 
                success: false,
                error: 'Only task owner can delete this task' 
            });
        }
        
        await TaskShare.deleteMany({ taskId });
        
        const task = await Task.findByIdAndDelete(taskId);
        
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        await this.clearTaskCache(taskId);
        
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/recurring', auth, async (req, res) => {
    try {
        const { title, description, priority, recurringPattern } = req.body;
        if (!recurringPattern || !recurringPattern.frequency || !recurringPattern.time) {
            return res.status(400).json({
                success: false,
                error: 'recurringPattern with frequency and time is required'
            });
            }
            const taskData = {
                title,
                description,
                priority: priority || 'medium',
                recurringPattern
            };
            const task = await recurringTasksService.createRecurringTask(taskData, req.user._id);
            await cacheDelete(`tasks:${req.user._id}`);
            res.status(201).json({
                success: true,
                task
            });
            
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    });
    
    router.post('/:id/share', auth, async (req, res) => {
        try {
            const { sharedWithEmail, permission } = req.body;
            const taskId = req.params.id;
            const canDelete = await permissionService.canDelete(req.user._id, taskId);
            if (!canDelete) {
                return res.status(403).json({
                    success: false,
                    error: 'Only task owner can share tasks'
                });
            }
            const User = require('../models/User');
            const sharedWithUser = await User.findOne({ email: sharedWithEmail });
            if (!sharedWithUser) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }
            if (sharedWithUser._id.toString() === req.user._id.toString()) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot share with yourself'
                });
            }
            const existingShare = await TaskShare.findOne({
                taskId,
                sharedWithUserId: sharedWithUser._id
            });
            
            if (existingShare) {
                existingShare.permission = permission;
                await existingShare.save();
            } else {
                const newShare = new TaskShare({
                    taskId,
                    ownerId: req.user._id,
                    sharedWithUserId: sharedWithUser._id,
                    permission
                });
                await newShare.save();
            }
            await cacheDelete(`tasks:${req.user._id}`);
        await cacheDelete(`tasks:${sharedWithUser._id}`);
        
        res.json({
            success: true,
            message: `Task shared with ${sharedWithEmail} as ${permission}`
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});
router.delete('/:id/share/:userId', auth, async (req, res) => {
    try {
        const taskId = req.params.id;
        const sharedWithUserId = req.params.userId;
        
        // בדיקה שהמשתמש הוא הבעלים
        const canDelete = await permissionService.canDelete(req.user._id, taskId);
        if (!canDelete) {
            return res.status(403).json({
                success: false,
                error: 'Only task owner can remove sharing'
            });
        }
        await TaskShare.findOneAndDelete({
            taskId,
            ownerId: req.user._id,
            sharedWithUserId
        });
        await cacheDelete(`tasks:${req.user._id}`);
        await cacheDelete(`tasks:${sharedWithUserId}`);
        
        res.json({
            success: true,
            message: 'Sharing removed successfully'
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.get('/:id/shares', auth, async (req, res) => {
    try {
        const taskId = req.params.id;
        const viewResult = await permissionService.canView(req.user._id, taskId);
        if (!viewResult.allowed) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }
        const shares = await TaskShare.find({ taskId })
        .populate('sharedWithUserId', 'name email')
        .populate('ownerId', 'name email');
    
    res.json({
        success: true,
        shares
    });
    
} catch (error) {
    res.status(500).json({
        success: false,
        error: error.message
    });
}
});

async function clearTaskCache(taskId) {
    try {
        const shares = await TaskShare.find({ taskId });
        const task = await Task.findById(taskId);
        
        if (task) {
            await cacheDelete(`tasks:${task.userId}`);
        }
        
        for (const share of shares) {
            await cacheDelete(`tasks:${share.sharedWithUserId}`);
        }
    } catch (error) {
        console.error('Error clearing task cache:', error);
    }
}

module.exports = router;