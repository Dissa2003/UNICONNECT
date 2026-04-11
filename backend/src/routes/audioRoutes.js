const express = require("express");
const router = express.Router();
const { randomUUID } = require("crypto");
const axios = require("axios");
const AudioRoom = require("../models/AudioRoom");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

// Vercel Reminder Service URL — same one used for todo reminders lor
const REMINDER_SERVICE_URL =
  process.env.REMINDER_SERVICE_URL ||
  "https://uniconnect-reminder.vercel.app";

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/audio/schedule
// Schedule a new audio room and ping the Vercel reminder service for both users
// Only logged-in users can do this lah
// ──────────────────────────────────────────────────────────────────────────────
router.post("/schedule", protect, async (req, res) => {
  try {
    const { chatId, participantId, scheduledTime } = req.body;

    if (!chatId || !participantId || !scheduledTime) {
      return res.status(400).json({
        message: "chatId, participantId, and scheduledTime are all required lah",
      });
    }

    const scheduledDate = new Date(scheduledTime);
    // Allow "Start Now" (within 10s of current time) or future scheduled times
    if (isNaN(scheduledDate.getTime()) || scheduledDate < new Date(Date.now() - 10_000)) {
      return res.status(400).json({
        message: "scheduledTime must be a valid date",
      });
    }

    // Don't let them schedule if there's already an active/scheduled room for this chat
    // Prevents duplicate rooms for the same chat lah
    const existing = await AudioRoom.findOne({
      chatId,
      status: { $in: ["scheduled", "active"] },
    });
    if (existing) {
      return res.status(409).json({
        message: "There is already a scheduled or active room for this chat lor",
        room: existing,
      });
    }

    // Generate a UUID as the room identifier — used by socket signaling sia
    const roomId = randomUUID();

    const room = await AudioRoom.create({
      hostId: req.user._id,
      participantId,
      chatId,
      roomId,
      scheduledTime: scheduledDate,
    });

    // ── Ping Vercel Reminder Service for BOTH users so they get email alerts lor ──
    // We don't block the response on this — fire and forget lah, reminder is best-effort
    const host = await User.findById(req.user._id).select("email name");
    const participant = await User.findById(participantId).select("email name");

    const reminderTitle = `Voice Call Reminder — UniConnect`;
    const triggerTime = scheduledDate.toISOString();

    const reminderPayloads = [];
    if (host?.email) {
      reminderPayloads.push({
        type: "CREATE",
        localTaskId: `audio-${roomId}-host`,
        email: host.email,
        title: reminderTitle,
        triggerTime,
      });
    }
    if (participant?.email) {
      reminderPayloads.push({
        type: "CREATE",
        localTaskId: `audio-${roomId}-participant`,
        email: participant.email,
        title: reminderTitle,
        triggerTime,
      });
    }

    // Fire reminder requests in parallel — ignore failures, don't block the user lah
    Promise.all(
      reminderPayloads.map((payload) =>
        axios
          .post(`${REMINDER_SERVICE_URL}/api/sync`, payload)
          .catch((err) =>
            console.warn(
              `Reminder sync failed for ${payload.email} lah:`,
              err.message
            )
          )
      )
    );

    return res.status(201).json({
      message: "Audio room scheduled lah, reminders sent to both users",
      room,
    });
  } catch (err) {
    console.error("POST /audio/schedule error:", err.message);
    return res.status(500).json({ message: "Server error lor" });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/audio/active/:chatId
// Fetch the latest scheduled or active audio room for a given chat session
// Used by frontend to check if Join button should show lor
// ──────────────────────────────────────────────────────────────────────────────
router.get("/active/:chatId", protect, async (req, res) => {
  try {
    const { chatId } = req.params;

    // Find the most recent non-ended room for this chat lah
    const room = await AudioRoom.findOne({
      chatId,
      status: { $in: ["scheduled", "active"] },
    })
      .sort({ scheduledTime: -1 })
      .populate("hostId", "name email")
      .populate("participantId", "name email");

    if (!room) {
      return res.status(404).json({ message: "No active room found for this chat lor" });
    }

    // Make sure only the two participants can see this room — security check sia
    const userId = String(req.user._id);
    if (
      String(room.hostId._id) !== userId &&
      String(room.participantId._id) !== userId
    ) {
      return res.status(403).json({ message: "You are not part of this room lah" });
    }

    return res.json({ room });
  } catch (err) {
    console.error("GET /audio/active/:chatId error:", err.message);
    return res.status(500).json({ message: "Server error lor" });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /api/audio/status
// Update room status when call starts (scheduled → active) or ends (active → ended)
// Both participants can call this lor
// ──────────────────────────────────────────────────────────────────────────────
router.patch("/status", protect, async (req, res) => {
  try {
    const { roomId, status } = req.body;

    if (!roomId || !status) {
      return res.status(400).json({ message: "roomId and status are required lah" });
    }

    if (!["active", "ended"].includes(status)) {
      return res.status(400).json({
        message: "status can only be 'active' or 'ended' lor — cannot set back to scheduled",
      });
    }

    const room = await AudioRoom.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ message: "Room not found lah" });
    }

    // Only the host or participant can update status sia
    const userId = String(req.user._id);
    if (
      String(room.hostId) !== userId &&
      String(room.participantId) !== userId
    ) {
      return res.status(403).json({ message: "Not your room lah" });
    }

    room.status = status;
    await room.save();

    return res.json({ message: `Room status updated to '${status}' lor`, room });
  } catch (err) {
    console.error("PATCH /audio/status error:", err.message);
    return res.status(500).json({ message: "Server error lor" });
  }
});

module.exports = router;
