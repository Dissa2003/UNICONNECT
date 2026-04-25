/**
 * MoodJournal Model
 * 
 * Defines the MongoDB schema for storing user mood journal entries.
 * Includes fields for the user's reflection text, the dynamically detected
 * stress level, and the corresponding feedback message.
 */
const mongoose = require('mongoose');

const MoodJournalSchema = new mongoose.Schema({
  // Reference to the User who created the entry
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // The actual text content of the journal reflection
  moodText: {
    type: String,
    required: [true, 'Please enter your mood text']
  },
  // The detected stress level (LOW, MEDIUM, HIGH)
  stressLevel: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    default: 'LOW'
  },
  // Auto-generated feedback message based on the stress level
  message: {
    type: String,
    required: [true, 'Feedback message is required']
  },
  // Timestamp of when the entry was created
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index by userId and createdAt for faster querying
MoodJournalSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('MoodJournal', MoodJournalSchema);
