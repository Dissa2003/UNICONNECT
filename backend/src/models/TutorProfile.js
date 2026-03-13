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
    educationQualification: String,
    yearsOfExperience: {
      type: Number,
      default: 0
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
    cityDistrict: String,
    teachingMode: {
      type: String,
      enum: ["Online", "Physical Classes", "Both", ""]
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("TutorProfile", TutorProfileSchema);
