// api/cron-worker.js
// GET /api/cron-worker — Vercel calls this on schedule, sends pending reminder emails
require('dotenv').config();

const connectDB = require('../lib/mongodb');
const Reminder = require('../models/Reminder');
const nodemailer = require('nodemailer');

function buildEmailHtml(title, triggerTime) {
  const formattedTime = new Date(triggerTime).toLocaleString('en-SG', {
    timeZone: 'Asia/Colombo',
    dateStyle: 'full',
    timeStyle: 'short',
  });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin:0;padding:0;background:#0A0E1A;font-family:'Segoe UI',sans-serif;">
        <div style="max-width:520px;margin:40px auto;background:#12182B;border-radius:16px;overflow:hidden;border:1px solid rgba(26,107,255,.25);">
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#1A6BFF,#00E5C3);padding:28px 32px;">
            <div style="font-size:1.8rem;margin-bottom:4px;">🔔</div>
            <div style="color:#fff;font-size:1.3rem;font-weight:800;letter-spacing:-0.02em;">
              UniConnect Reminder
            </div>
          </div>

          <!-- Body -->
          <div style="padding:28px 32px;">
            <p style="color:rgba(255,255,255,.55);font-size:0.85rem;margin:0 0 6px;">Your task reminder is here!</p>
            <h2 style="color:#FFFFFF;font-size:1.25rem;margin:0 0 20px;font-weight:700;">
              ${title}
            </h2>

            <div style="background:rgba(26,107,255,.1);border:1px solid rgba(26,107,255,.25);border-radius:10px;padding:14px 16px;margin-bottom:24px;">
              <span style="color:rgba(255,255,255,.5);font-size:0.78rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">
                Reminder set for
              </span>
              <div style="color:#38BFFF;font-size:0.95rem;font-weight:700;margin-top:4px;">
                ${formattedTime}
              </div>
            </div>

            <p style="color:rgba(255,255,255,.45);font-size:0.8rem;margin:0;line-height:1.6;">
              This is your automated reminder from UniConnect.<br/>
              Log in to view and manage your tasks.
            </p>
          </div>

          <!-- Footer -->
          <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,.06);">
            <p style="color:rgba(255,255,255,.25);font-size:0.72rem;margin:0;">
              UniConnect · Reminder Microservice · Sent automatically
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    await connectDB();
  } catch (err) {
    console.error('DB connection failed:', err.message);
    return res.status(503).json({ success: false, message: 'DB connection failed' });
  }

  const now = new Date();

  let dueReminders;
  try {
    dueReminders = await Reminder.find({
      status: 'pending',
      triggerTime: { $lte: now },
    });
  } catch (err) {
    console.error('Query failed:', err.message);
    return res.status(500).json({ success: false, message: 'DB query failed' });
  }

  if (dueReminders.length === 0) {
    return res.json({ success: true, message: 'No pending reminders', sent: 0, failed: 0 });
  }

  console.log(`Found ${dueReminders.length} due reminders`);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: (process.env.EMAIL_PASS || '').replace(/\s/g, ''),
    },
  });

  try {
    await transporter.verify();
  } catch (err) {
    console.error('Email transporter verify failed:', err.message);
    return res.status(500).json({ success: false, message: 'Email config error - check EMAIL_USER and EMAIL_PASS' });
  }

  let sentCount = 0;
  let failedCount = 0;
  const results = [];

  for (const reminder of dueReminders) {
    try {
      await transporter.sendMail({
        from: `"UniConnect Reminders 🔔" <${process.env.EMAIL_USER}>`,
        to: reminder.email,
        subject: `⏰ Reminder: ${reminder.title}`,
        html: buildEmailHtml(reminder.title, reminder.triggerTime),
        text: `Reminder: ${reminder.title}\n\nYour task reminder is due.\n\nSet for: ${new Date(reminder.triggerTime).toLocaleString()}\n\n- UniConnect`,
      });

      reminder.status = 'sent';
      await reminder.save();
      sentCount++;

      results.push({ localTaskId: reminder.localTaskId, status: 'sent' });
      console.log(`Sent reminder for task ${reminder.localTaskId} to ${reminder.email}`);
    } catch (emailErr) {
      console.error(`Failed to send reminder for task ${reminder.localTaskId}:`, emailErr.message);
      reminder.status = 'failed';
      await reminder.save();
      failedCount++;

      results.push({ localTaskId: reminder.localTaskId, status: 'failed', error: emailErr.message });
    }
  }

  return res.json({
    success: true,
    message: `Done - ${sentCount} sent, ${failedCount} failed`,
    sent: sentCount,
    failed: failedCount,
    results,
  });
};
