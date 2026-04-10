// models/Reminder.js
// Mongoose schema for reminders - store in Atlas lah, not local one
const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema(
  {
    // localTaskId is the _id from our local backend's Todo collection - tie them together lor
    localTaskId: {
      type: String,
      required: true,
      index: true, // Make query fast can - index this field lah
    },

    // Who to send the reminder email to hor
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    // Title of the task - put inside email subject one lah
    title: {
      type: String,
      required: true,
      trim: true,
    },

    // When to fire the reminder - compare with current time in cron worker lor
    triggerTime: {
      type: Date,
      required: true,
    },

    // Status flow: pending → sent (or failed if alamak something went wrong)
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
    },
  },
  {
    // Automatically add createdAt and updatedAt - shiok, no need do manually
    timestamps: true,
  }
);

// mongoose.models check prevents "Cannot overwrite model once compiled" error
// when Vercel reuses the module cache - classic serverless gotcha lah
module.exports = mongoose.models.Reminder || mongoose.model('Reminder', reminderSchema);
