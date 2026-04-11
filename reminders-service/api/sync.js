// api/sync.js
// POST /api/sync — Called by the backend on todo CRUD, not by frontend directly
require('dotenv').config();

const connectDB = require('../lib/mongodb');
const Reminder = require('../models/Reminder');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed, use POST' });
  }

  try {
    await connectDB();
  } catch (err) {
    console.error('DB connection failed:', err.message);
    return res.status(503).json({ success: false, message: 'Database connection failed' });
  }

  const { type, localTaskId, email, title, triggerTime } = req.body;

  if (!type) {
    return res.status(400).json({ success: false, message: 'type field required (CREATE / UPDATE / DELETE)' });
  }

  try {
    // ── CREATE: New task reminder added by user lah ──
    if (type === 'CREATE') {
      // Validate all required fields - cannot create reminder without these hor
      if (!localTaskId || !email || !title || !triggerTime) {
        return res.status(400).json({
          success: false,
          message: 'CREATE needs localTaskId, email, title, triggerTime lah',
        });
      }

      const existing = await Reminder.findOne({ localTaskId });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Reminder already exists for this task, use UPDATE',
        });
      }

      const reminder = await Reminder.create({
        localTaskId,
        email,
        title,
        triggerTime: new Date(triggerTime),
      });

      return res.status(201).json({ success: true, message: 'Reminder created', reminder });
    }

    if (type === 'UPDATE') {
      if (!localTaskId) {
        return res.status(400).json({ success: false, message: 'UPDATE needs localTaskId' });
      }

      const updates = {};
      if (email) updates.email = email;
      if (title) updates.title = title;
      if (triggerTime) updates.triggerTime = new Date(triggerTime);
      updates.status = 'pending';

      const reminder = await Reminder.findOneAndUpdate(
        { localTaskId },
        { $set: updates },
        { new: true }
      );

      if (!reminder) {
        return res.status(404).json({ success: false, message: 'Reminder not found, use CREATE first' });
      }

      return res.json({ success: true, message: 'Reminder updated', reminder });
    }

    if (type === 'DELETE') {
      if (!localTaskId) {
        return res.status(400).json({ success: false, message: 'DELETE needs localTaskId' });
      }

      const deleted = await Reminder.findOneAndDelete({ localTaskId });

      if (!deleted) {
        return res.json({ success: true, message: 'Reminder not found, already removed' });
      }

      return res.json({ success: true, message: 'Reminder deleted' });
    }

    // Alamak, unknown type - inform caller lah
    return res.status(400).json({
      success: false,
      message: `Unknown type '${type}' lah - only CREATE, UPDATE, DELETE can`,
    });
  } catch (err) {
    console.error('Sync error lah:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error lor', error: err.message });
  }
};
