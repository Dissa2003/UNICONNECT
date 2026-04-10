// services/reminderSyncService.js
// Calls the hosted Vercel reminders-service lah.
// Fire-and-forget — if the remote call fails, we just log it, never break the todo API hor.
const axios = require('axios');

const BASE_URL = process.env.REMINDERS_SERVICE_URL; // e.g. https://reminders-service.vercel.app

/**
 * syncReminder — tell the remote service to CREATE / UPDATE / DELETE a reminder.
 *
 * @param {'CREATE'|'UPDATE'|'DELETE'} type
 * @param {{ localTaskId: string, email?: string, title?: string, triggerTime?: string|null }} payload
 */
async function syncReminder(type, { localTaskId, email, title, triggerTime }) {
  // If URL not configured yet, skip silently lah — dev mode can
  if (!BASE_URL) {
    console.log(`[reminderSync] REMINDERS_SERVICE_URL not set, skipping ${type} for ${localTaskId}`);
    return;
  }

  try {
    await axios.post(
      `${BASE_URL}/api/sync`,
      { type, localTaskId, email, title, triggerTime },
      { timeout: 8000 } // Don't hang forever hor — 8s max
    );
    console.log(`[reminderSync] ${type} synced for task ${localTaskId} lor`);
  } catch (err) {
    // Log but never throw — caller doesn't need to worry about this lah
    const status = err?.response?.status;
    const msg = err?.response?.data?.message || err.message;
    console.error(`[reminderSync] ${type} failed for ${localTaskId} lah — ${status || 'network'}: ${msg}`);
  }
}

module.exports = { syncReminder };
