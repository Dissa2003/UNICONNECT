// models/VoiceRoom.js
// Schema for scheduled voice rooms - decoupled from the main backend lah
// chatId links back to any chat context (StudyGroup _id from main backend)
const mongoose = require('mongoose');

const VoiceRoomSchema = new mongoose.Schema(
  {
    // UUID string - used as the socket room name for WebRTC signaling lor
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Links this voice room to the existing text chat (StudyGroup _id) sia
    // Stored as a String here because this is a separate DB — no cross-service ObjectId refs
    chatId: {
      type: String,
      required: true,
      index: true,
    },

    // Who created/scheduled the room lah
    hostId: {
      type: String,
      required: true,
    },

    // The other person in the 1-to-1 call lor
    participantId: {
      type: String,
      required: true,
    },

    // Email addresses so this service can fire reminders independently sia
    hostEmail: { type: String, default: '' },
    participantEmail: { type: String, default: '' },

    // When the call is supposed to happen
    scheduledTime: {
      type: Date,
      required: true,
    },

    // Room lifecycle: scheduled → active → ended lor
    status: {
      type: String,
      enum: ['scheduled', 'active', 'ended'],
      default: 'scheduled',
    },
  },
  { timestamps: true }
);

// Guard against Vercel module cache re-compilation error — classic serverless gotcha lah
module.exports = mongoose.models.VoiceRoom || mongoose.model('VoiceRoom', VoiceRoomSchema);
