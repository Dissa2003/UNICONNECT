const mongoose = require("mongoose");

// AudioRoom model — keeps track of scheduled/active voice calls between two users
// Decoupled from text chat but shares the same chatId (StudyGroup _id) as context lor
const AudioRoomSchema = new mongoose.Schema(
  {
    // The person who created/scheduled the room lah
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // The other participant in the 1-to-1 call lor
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Which chat session this audio room belongs to — tie it back to StudyGroup _id sia
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudyGroup",
      required: true,
    },

    // Unique room identifier used as the socket room name for WebRTC signaling
    roomId: {
      type: String,
      required: true,
      unique: true,
    },

    // When is the call supposed to happen lah
    scheduledTime: {
      type: Date,
      required: true,
    },

    // Lifecycle of the room — scheduled → active → ended lor
    status: {
      type: String,
      enum: ["scheduled", "active", "ended"],
      default: "scheduled",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AudioRoom", AudioRoomSchema);
