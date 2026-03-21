const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudyGroup",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isBot: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: ["text", "file"],
      default: "text",
    },
    content: {
      type: String,
      default: "",
    },
    // for file messages
    fileName: String,
    fileUrl: String,
    fileSize: Number,
  },
  { timestamps: true }
);

MessageSchema.index({ group: 1, createdAt: 1 });

module.exports = mongoose.model("Message", MessageSchema);
