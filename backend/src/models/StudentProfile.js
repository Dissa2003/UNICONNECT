// src/models/StudentProfile.js
const mongoose = require("mongoose");

const StudentProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  name: String,
  email: String,
  university: String,
  degreeProgram: String,
  year: Number,

  subjects: [String],
  weakSubjects: [String],
  strongSubjects: [String],
  skills: [String],

  studyGoals: [String],
  careerGoals: [String],
  examGoals: [String],

  learningStyle: String,

  // store availability as a simple object map {"Mon-08:00": true}
  availability: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  productivityTime: String,
  studyMode: String,

  personalityType: String,
  communicationStyle: String,

  stressLevel: Number,
  burnoutRisk: Boolean,

  tags: [String],
  interests: [String]
});

// ensure one profile per user
StudentProfileSchema.index({ user: 1 }, { unique: true });

module.exports = mongoose.model("StudentProfile", StudentProfileSchema);
