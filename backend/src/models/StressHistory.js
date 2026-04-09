const mongoose = require('mongoose');

const StressHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true, // YYYY-MM-DD
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    level: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StressHistory', StressHistorySchema);
