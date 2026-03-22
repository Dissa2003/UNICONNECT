const mongoose = require("mongoose");

const TutorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    firstName: String,
    lastName: String,
    personalEmail: String,
    phoneNumber: String,
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ["Male", "Female", "Other", "Prefer not to say", ""]
    },
    subjectsYouTeach: {
      type: [String],
      default: []
    },
    teachingStyle: {
      type: String,
      enum: [
        "Theory-based",
        "Practical/Hands-on",
        "Exam-oriented",
        "Visual",
        "Auditory",
        "Kinaesthetic",
        "Reading/Writing",
        "",
      ],
    },
    language: {
      type: String,
      enum: ["English", "Sinhala", "Singlish", "Tamil", ""],
    },
    hourlyRate: {
      type: Number,
      min: 0,
      default: 0,
    },
    isFree: {
      type: Boolean,
      default: false,
    },
    educationQualification: String,
    yearsOfExperience: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    teachingLevel: {
      type: String,
      enum: ["Primary", "O/L", "A/L", "University", ""]
    },
    availableDays: {
      type: [String],
      default: []
    },
    availableTime: {
      type: String,
      enum: ["Morning", "Afternoon", "Evening", ""]
    },
    // same shape as student availability: { "Mon-08:00": true }
    availability: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    cityDistrict: String,
    teachingMode: {
      type: String,
      enum: ["Online", "Physical Classes", "Both", ""]
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("TutorProfile", TutorProfileSchema);
