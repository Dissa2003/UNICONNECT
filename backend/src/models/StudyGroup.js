const mongoose = require("mongoose");

const MemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "member"],
      default: "member",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const StudyGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    groupRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GroupRequest",
      required: true,
    },
    members: {
      type: [MemberSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length >= 2,
        message: "A study group must have at least 2 members",
      },
    },
  },
  { timestamps: true }
);

StudyGroupSchema.index({ "members.user": 1 });
StudyGroupSchema.index({ groupRequest: 1 }, { unique: true });

module.exports = mongoose.model("StudyGroup", StudyGroupSchema);
