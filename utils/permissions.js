const TaskShare = require('../models/TaskShare');
const Task = require('../models/Task');

class PermissionService {
    async canView(userId, taskId) {
        const task = await Task.findById(taskId);
        if (!task) return false;
        if (task.userId.toString() === userId.toString()) {
            return { allowed: true, role: 'owner' };
        }
        const share = await TaskShare.findOne({ 
            taskId, 
            sharedWithUserId: userId 
        });
        if (share) {
            return { allowed: true, role: share.permission };
        }
        
        return { allowed: false, role: null };
    }
    async canEdit(userId, taskId) {
        const viewResult = await this.canView(userId, taskId);
        
        if (!viewResult.allowed) return false;
        return viewResult.role === 'owner' || viewResult.role === 'editor';
    }
    async canDelete(userId, taskId) {
        const task = await Task.findById(taskId);
        if (!task) return false;
        return task.userId.toString() === userId.toString();
    }
    async getUserVisibleTasks(userId) {
        const ownTasks = await Task.find({ userId });

        const sharedTaskIds = await TaskShare.find({ sharedWithUserId: userId })
            .select('taskId');
        
        const sharedTasks = await Task.find({
            _id: { $in: sharedTaskIds.map(s => s.taskId) }
        });
        const allTasks = [...ownTasks, ...sharedTasks];
        const uniqueTasks = allTasks.filter((task, index, self) => 
            index === self.findIndex(t => t._id.toString() === task._id.toString())
        );
        
        return uniqueTasks;
    }
}

module.exports = new PermissionService();