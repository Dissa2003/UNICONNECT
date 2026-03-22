const mongoose = require("mongoose");

const TutorBookingSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    studentProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentProfile",
      required: true,
    },
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tutorProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TutorProfile",
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    maxBudget: {
      type: Number,
      min: 0,
      required: true,
    },
    learningStyle: {
      type: String,
      required: true,
      trim: true,
    },
    language: {
      type: String,
      trim: true,
      default: "",
    },
    requestedAvailability: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    matchScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    reasons: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

TutorBookingSchema.index({ tutor: 1, createdAt: -1 });
TutorBookingSchema.index({ student: 1, createdAt: -1 });

module.exports = mongoose.model("TutorBooking", TutorBookingSchema);
