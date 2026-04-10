const mongoose = require('mongoose');

const userDocSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 300 },
  fileUrl: { type: String, required: true },
  publicId: { type: String, required: true },
  size: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('UserDoc', userDocSchema);
