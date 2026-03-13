const mongoose = require("mongoose");

const InviteeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    studentProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentProfile",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted"],
      default: "pending",
    },
    matchScore: {
      type: Number,
      default: 0,
    },
    reasons: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const GroupRequestSchema = new mongoose.Schema(
  {
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requestedByProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentProfile",
      required: true,
    },
    invitees: {
      type: [InviteeSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length >= 1 && v.length <= 4,
        message: "Invitees must contain between 1 and 4 members",
      },
    },
    memberUserIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    status: {
      type: String,
      enum: ["pending", "grouped"],
      default: "pending",
    },
  },
  { timestamps: true }
);

GroupRequestSchema.index({ requestedBy: 1, status: 1 });
GroupRequestSchema.index({ "invitees.user": 1, status: 1 });

module.exports = mongoose.model("GroupRequest", GroupRequestSchema);
