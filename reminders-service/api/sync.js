// api/sync.js
// POST /api/sync — Called by your local backend lah, not by frontend directly
// type field in body decides what action to do: CREATE, UPDATE, or DELETE
// Completely decoupled from local backend - only talk via HTTP lor
require('dotenv').config();

const connectDB = require('../lib/mongodb');
const Reminder = require('../models/Reminder');

module.exports = async (req, res) => {
  // Only accept POST requests lah - other methods cannot one
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed lah, use POST only' });
  }

  // Connect to Atlas first - singleton so don't worry about performance hor
  try {
    await connectDB();
  } catch (err) {
    console.error('DB connection failed lah:', err.message);
    return res.status(503).json({ success: false, message: 'Database connection failed lor' });
  }

  const { type, localTaskId, email, title, triggerTime } = req.body;

  // Must have a type field - otherwise how we know what to do sia
  if (!type) {
    return res.status(400).json({ success: false, message: 'type field required lah (CREATE / UPDATE / DELETE)' });
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

      // Check if same localTaskId already exist - don't double-create lor
      const existing = await Reminder.findOne({ localTaskId });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Reminder for this task already exist lah, use UPDATE lor',
        });
      }

      const reminder = await Reminder.create({
        localTaskId,
        email,
        title,
        triggerTime: new Date(triggerTime),
      });

      return res.status(201).json({ success: true, message: 'Reminder created lor', reminder });
    }

    // ── UPDATE: User edited their task - update the reminder details ──
    if (type === 'UPDATE') {
      if (!localTaskId) {
        return res.status(400).json({ success: false, message: 'UPDATE needs localTaskId lah' });
      }

      const updates = {};
      if (email) updates.email = email;
      if (title) updates.title = title;
      if (triggerTime) updates.triggerTime = new Date(triggerTime);
      // Reset to pending so cron worker will fire again - important hor
      updates.status = 'pending';

      const reminder = await Reminder.findOneAndUpdate(
        { localTaskId },
        { $set: updates },
        { new: true } // Return updated document lor
      );

      if (!reminder) {
        return res.status(404).json({ success: false, message: 'Cannot find reminder lah, maybe CREATE first' });
      }

      return res.json({ success: true, message: 'Reminder updated lor', reminder });
    }

    // ── DELETE: Task deleted or reminder cleared by user ──
    if (type === 'DELETE') {
      if (!localTaskId) {
        return res.status(400).json({ success: false, message: 'DELETE needs localTaskId lah' });
      }

      const deleted = await Reminder.findOneAndDelete({ localTaskId });

      if (!deleted) {
        // Already gone - no worries lah, treat as success
        return res.json({ success: true, message: 'Reminder not found but that is ok lor, already gone' });
      }

      return res.json({ success: true, message: 'Reminder deleted lor' });
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
