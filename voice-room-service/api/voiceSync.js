// api/voiceSync.js
// Called by the frontend (or main backend) to manage voice room records lah
// Vercel deploys this as a serverless function — handles POST / GET / PATCH lor
// ─────────────────────────────────────────────────────────────────────────────
// POST  → Create a new voice room + fire email reminders to both users
// GET   → Fetch active/scheduled room by ?chatId=xxx
// PATCH → Update room status (active or ended)
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const connectDB = require('../lib/mongodb');
const VoiceRoom = require('../models/VoiceRoom');

const REMINDER_SERVICE_URL =
  process.env.REMINDER_SERVICE_URL || 'https://uniconnect-reminder.vercel.app';

// ── Email HTML builder — same design language as reminders-service lor ────────
function buildVoiceEmailHtml(scheduledTime) {
  const formatted = new Date(scheduledTime).toLocaleString('en-SG', {
    timeZone: 'Asia/Colombo',
    dateStyle: 'full',
    timeStyle: 'short',
  });
  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
      <body style="margin:0;padding:0;background:#0A0E1A;font-family:'Segoe UI',sans-serif;">
        <div style="max-width:520px;margin:40px auto;background:#12182B;border-radius:16px;overflow:hidden;border:1px solid rgba(26,107,255,.25);">
          <div style="background:linear-gradient(135deg,#1A6BFF,#7B2FFF);padding:28px 32px;">
            <div style="font-size:1.8rem;margin-bottom:4px;">🎙️</div>
            <div style="color:#fff;font-size:1.3rem;font-weight:800;">UniConnect — Voice Call Reminder</div>
          </div>
          <div style="padding:28px 32px;">
            <p style="color:rgba(255,255,255,.55);font-size:0.85rem;margin:0 0 6px;">Your scheduled voice call is coming up lah!</p>
            <div style="background:rgba(26,107,255,.1);border:1px solid rgba(26,107,255,.25);border-radius:10px;padding:14px 16px;margin-bottom:24px;">
              <span style="color:rgba(255,255,255,.5);font-size:0.78rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Call scheduled for</span>
              <div style="color:#38BFFF;font-size:0.95rem;font-weight:700;margin-top:4px;">${formatted}</div>
            </div>
            <p style="color:rgba(255,255,255,.45);font-size:0.8rem;margin:0;line-height:1.6;">
              Log in to UniConnect and open your chat to join the call when it's time lor.
            </p>
          </div>
          <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,.06);">
            <p style="color:rgba(255,255,255,.25);font-size:0.72rem;margin:0;">UniConnect · Voice Room Service · Sent automatically</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

module.exports = async (req, res) => {
  // CORS headers lor — frontend calls this directly
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Connect to MongoDB — singleton, safe to call every time lah
  try {
    await connectDB();
  } catch (err) {
    console.error('DB connection failed lah:', err.message);
    return res.status(503).json({ success: false, message: 'Database connection failed lor' });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // POST — Create a new voice room + sync reminders to both users
  // Body: { chatId, hostId, participantId, hostEmail, participantEmail, scheduledTime }
  // ────────────────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { chatId, hostId, participantId, hostEmail, participantEmail, scheduledTime, startNow } = req.body || {};

    if (!chatId || !hostId || !participantId || !scheduledTime) {
      return res.status(400).json({
        success: false,
        message: 'Need chatId, hostId, participantId, scheduledTime lah',
      });
    }

    const scheduledDate = new Date(scheduledTime);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ success: false, message: 'scheduledTime must be a valid date lor' });
    }

    // startNow=true means immediate room — allow scheduledTime = now sia
    // Only reject past times for scheduled (future) rooms lah
    if (!startNow && scheduledDate <= new Date()) {
      return res.status(400).json({ success: false, message: 'scheduledTime must be a future date lor' });
    }

    // Don't double-create if there's already a pending/active room for this chat sia
    const existing = await VoiceRoom.findOne({ chatId, status: { $in: ['scheduled', 'active'] } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Already got a scheduled/active room for this chat lor',
        room: existing,
      });
    }

    const roomId = uuidv4();

    const room = await VoiceRoom.create({
      roomId,
      chatId,
      hostId,
      participantId,
      hostEmail: hostEmail || '',
      participantEmail: participantEmail || '',
      scheduledTime: scheduledDate,
      // Immediate rooms start as 'active' straight away lor — no need to wait lah
      status: startNow ? 'active' : 'scheduled',
    });

    // ── Fire reminders — only for scheduled rooms, no point emailing for "Start Now" lah ──
    if (!startNow) {
      const reminderPayloads = [];
      if (hostEmail) {
        reminderPayloads.push({
          type: 'CREATE',
          localTaskId: `voice-${roomId}-host`,
          email: hostEmail,
          title: '🎙️ Voice Call Reminder — UniConnect',
          triggerTime: scheduledDate.toISOString(),
        });
      }
      if (participantEmail) {
        reminderPayloads.push({
          type: 'CREATE',
          localTaskId: `voice-${roomId}-participant`,
          email: participantEmail,
          title: '🎙️ Voice Call Reminder — UniConnect',
          triggerTime: scheduledDate.toISOString(),
        });
      }
      if (reminderPayloads.length > 0) {
        Promise.all(
          reminderPayloads.map((p) =>
            axios.post(`${REMINDER_SERVICE_URL}/api/sync`, p).catch((err) =>
              console.warn(`Reminder sync failed for ${p.email} lah:`, err.message)
            )
          )
        );
      }
    }

    return res.status(201).json({
      success: true,
      message: startNow ? 'Voice room started now lor' : 'Voice room scheduled, reminders sent lah',
      room,
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // GET — Fetch active/scheduled room for a given chatId
  // Query: ?chatId=xxx
  // ────────────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const chatId = req.query?.chatId;
    if (!chatId) {
      return res.status(400).json({ success: false, message: 'chatId query param required lah' });
    }

    const room = await VoiceRoom.findOne(
      { chatId, status: { $in: ['scheduled', 'active'] } },
      null,
      { sort: { scheduledTime: -1 } }
    );

    if (!room) {
      return res.status(404).json({ success: false, message: 'No active room found lor' });
    }

    return res.json({ success: true, room });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PATCH — Update room status (scheduled→active when call starts, active→ended)
  // Body: { roomId, status }
  // ────────────────────────────────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const { roomId, status } = req.body || {};

    if (!roomId || !status) {
      return res.status(400).json({ success: false, message: 'roomId and status required lah' });
    }

    if (!['active', 'ended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "status can only be 'active' or 'ended' lor — cannot go back to scheduled",
      });
    }

    const room = await VoiceRoom.findOneAndUpdate(
      { roomId },
      { $set: { status } },
      { new: true }
    );

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found lah' });
    }

    return res.json({ success: true, message: `Room status updated to '${status}' lor`, room });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed lah' });
};
