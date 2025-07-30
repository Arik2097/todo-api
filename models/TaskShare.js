const mongoose = require('mongoose');

const taskShareSchema = new mongoose.Schema({
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sharedWithUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    permission: {
        type: String,
        enum: ['viewer', 'editor'],
        required: true
    },
    sharedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

taskShareSchema.index({ taskId: 1, sharedWithUserId: 1 }, { unique: true });

module.exports = mongoose.model('TaskShare', taskShareSchema);