const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    completed: {
        type: Boolean,
        default: false
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    isRecurring: {
        type: Boolean,
        default: false
    },
    recurringPattern: {
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'monthly'],
            required: function() { return this.isRecurring; }
        },
        time: {
            type: String,
            required: function() { return this.isRecurring; }
        },
        dayOfWeek: {
            type: Number,
            min: 0,
            max: 6
        },
        dayOfMonth: {
            type: Number, 
            min: 1,
            max: 31
        }
    },
    parentTaskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task', 
        default: null
    },
    nextDueDate: {
        type: Date 
    } 
}, 

{
    timestamps: true
});

module.exports = mongoose.model('Task', taskSchema);