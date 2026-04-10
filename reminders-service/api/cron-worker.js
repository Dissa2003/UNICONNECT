// api/cron-worker.js
// Vercel Cron Job — runs every 5 minutes automatically lor (configured in vercel.json)
// GET /api/cron-worker — Vercel calls this on schedule, we send pending reminder emails lah
// Don't manually call this in production - let Vercel handle it hor
require('dotenv').config();

const connectDB = require('../lib/mongodb');
const Reminder = require('../models/Reminder');
const nodemailer = require('nodemailer');

// Build a nice HTML email body lah - at least make it look decent
function buildEmailHtml(title, triggerTime) {
  const formattedTime = new Date(triggerTime).toLocaleString('en-SG', {
    timeZone: 'Asia/Colombo', // Sri Lanka time hor
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
  // Only GET allowed - Vercel cron sends GET request lor
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed lah' });
  }

  // Vercel sends Authorization header for cron jobs - check it hor (optional but safer)
  // For local dev, skip this check can
  if (process.env.VERCEL === '1') {
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Wah, unauthorized caller - reject lah
      // Note: CRON_SECRET is auto-set by Vercel - no need add to .env manually
      return res.status(401).json({ success: false, message: 'Unauthorized lor' });
    }
  }

  // Connect to Atlas lah
  try {
    await connectDB();
  } catch (err) {
    console.error('DB connection failed lor:', err.message);
    return res.status(503).json({ success: false, message: 'DB connection failed lah' });
  }

  const now = new Date();

  // Find all reminders that are due and still pending - these need emails sent lah
  let dueReminders;
  try {
    dueReminders = await Reminder.find({
      status: 'pending',
      triggerTime: { $lte: now }, // triggerTime is in the past or now lor
    });
  } catch (err) {
    console.error('Query failed lah:', err.message);
    return res.status(500).json({ success: false, message: 'DB query failed lor' });
  }

  // Nothing to do - all quiet lah
  if (dueReminders.length === 0) {
    return res.json({ success: true, message: 'No pending reminders lah, chill lor', sent: 0, failed: 0 });
  }

  console.log(`Found ${dueReminders.length} due reminders - send emails lah`);

  // Setup Gmail transporter - use App Password hor, not actual Gmail password
  // Spaces in app password are ignored by Gmail - shiok no need strip
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Verify transporter config - catch wrong credentials early lah
  try {
    await transporter.verify();
  } catch (err) {
    console.error('Email transporter verify failed lah:', err.message);
    return res.status(500).json({ success: false, message: 'Email config wrong lor - check EMAIL_USER and EMAIL_PASS' });
  }

  let sentCount = 0;
  let failedCount = 0;
  const results = [];

  // Loop through each due reminder and send email one by one lor
  for (const reminder of dueReminders) {
    try {
      await transporter.sendMail({
        from: `"UniConnect Reminders 🔔" <${process.env.EMAIL_USER}>`,
        to: reminder.email,
        subject: `⏰ Reminder: ${reminder.title}`,
        html: buildEmailHtml(reminder.title, reminder.triggerTime),
        // Plain text fallback for email clients that don't support HTML lor
        text: `Reminder: ${reminder.title}\n\nYour task reminder is due.\n\nSet for: ${new Date(reminder.triggerTime).toLocaleString()}\n\n- UniConnect`,
      });

      // Wah email sent - update status to 'sent' lor
      reminder.status = 'sent';
      await reminder.save();
      sentCount++;

      results.push({ localTaskId: reminder.localTaskId, status: 'sent' });
      console.log(`Sent reminder for task ${reminder.localTaskId} to ${reminder.email} lor`);
    } catch (emailErr) {
      // Alamak, email send failed - mark as failed but continue with others lah
      console.error(`Failed to send reminder for task ${reminder.localTaskId} lah:`, emailErr.message);
      reminder.status = 'failed';
      await reminder.save();
      failedCount++;

      results.push({ localTaskId: reminder.localTaskId, status: 'failed', error: emailErr.message });
    }
  }

  // Return summary - steady lah
  return res.json({
    success: true,
    message: `Cron done lor - ${sentCount} sent, ${failedCount} failed`,
    sent: sentCount,
    failed: failedCount,
    results,
  });
};
