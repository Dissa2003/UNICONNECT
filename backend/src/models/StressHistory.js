/**
 * StressHistory Model
 * 
 * Defines the MongoDB schema for storing historical stress scores.
 * These scores are typically generated via the ML model questionnaire.
 */
const mongoose = require('mongoose');

const StressHistorySchema = new mongoose.Schema(
  {
    // Reference to the User
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // The date the assessment was taken (formatted as YYYY-MM-DD for easy querying)
    date: {
      type: String,
      required: true,
    },
    // The calculated stress score (0 to 100)
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    // The human-readable stress level (Low, Medium, High)
    level: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StressHistory', StressHistorySchema);
