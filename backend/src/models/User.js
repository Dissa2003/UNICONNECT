const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true
  },

  role: {
    type: String,
    enum: ["admin", "tutor", "student"],
    default: "student"
  },

  roles: {
    type: [
      {
        type: String,
        enum: ["admin", "tutor", "student"]
      }
    ],
    default: ["student"]
  },

  tokenVersion: {
    type: Number,
    default: 0
  },

  faceAuth: {
    enabled: {
      type: Boolean,
      default: false
    },
    descriptor: {
      type: [Number],
      default: []
    },
    descriptorLength: {
      type: Number,
      default: 0
    },
    updatedAt: Date
  },

  university: String,
  degreeProgram: String,
  year: Number,
  avatar: { type: String, default: '' }
});

module.exports = mongoose.model("User", UserSchema);