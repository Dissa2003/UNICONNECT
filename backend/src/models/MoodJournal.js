const mongoose = require('mongoose');

const MoodJournalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  moodText: {
    type: String,
    required: [true, 'Please enter your mood text']
  },
  stressLevel: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    default: 'LOW'
  },
  message: {
    type: String,
    required: [true, 'Feedback message is required']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index by userId and createdAt for faster querying
MoodJournalSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('MoodJournal', MoodJournalSchema);
