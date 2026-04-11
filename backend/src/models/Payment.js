const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tutorBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TutorBooking",
      default: null,
    },
    tutorProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TutorProfile",
      required: true,
    },
    hourlyRate: {
      type: Number,
      required: true,
      min: 0,
    },
    hours: {
      type: Number,
      required: true,
      min: 0.5,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "LKR",
    },
    // Last 4 digits of card (stored only for display, never the full number)
    cardLastFour: {
      type: String,
      default: "",
    },
    cardHolderName: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    transactionRef: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

PaymentSchema.index({ student: 1, createdAt: -1 });
PaymentSchema.index({ tutor: 1, createdAt: -1 });

module.exports = mongoose.model("Payment", PaymentSchema);
