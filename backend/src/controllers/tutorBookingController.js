const TutorBooking = require("../models/TutorBooking");
const StudentProfile = require("../models/StudentProfile");
const TutorProfile = require("../models/TutorProfile");
const StudyGroup = require("../models/StudyGroup");

const createTutorBooking = async (req, res) => {
  try {
    const {
      studentProfileId,
      tutorProfileId,
      subject,
      maxBudget,
      learningStyle,
      language,
      requestedAvailability = {},
      matchScore = 0,
      reasons = [],
    } = req.body || {};

    if (!studentProfileId || !tutorProfileId) {
      return res.status(400).json({ message: "Student profile and tutor profile are required" });
    }
    if (!subject || !String(subject).trim()) {
      return res.status(400).json({ message: "Subject is required" });
    }
    if (maxBudget === undefined || maxBudget === null || Number(maxBudget) < 0) {
      return res.status(400).json({ message: "Valid budget is required" });
    }
    if (!learningStyle || !String(learningStyle).trim()) {
      return res.status(400).json({ message: "Learning style is required" });
    }

    const studentProfile = await StudentProfile.findById(studentProfileId);
    if (!studentProfile) {
      return res.status(404).json({ message: "Student profile not found" });
    }
    if (String(studentProfile.user) !== String(req.user.id)) {
      return res.status(403).json({ message: "You can only create bookings for your own profile" });
    }

    const tutorProfile = await TutorProfile.findById(tutorProfileId);
    if (!tutorProfile) {
      return res.status(404).json({ message: "Tutor profile not found" });
    }

    const booking = await TutorBooking.create({
      student: req.user.id,
      studentProfile: studentProfile._id,
      tutor: tutorProfile.user,
      tutorProfile: tutorProfile._id,
      subject: String(subject).trim(),
      maxBudget: Number(maxBudget),
      learningStyle: String(learningStyle).trim(),
      language: String(language || "").trim(),
      requestedAvailability,
      matchScore: Math.max(0, Math.min(Number(matchScore) || 0, 1)),
      reasons: Array.isArray(reasons) ? reasons.slice(0, 10) : [],
      status: "pending",
    });

    return res.status(201).json({ message: "Tutor booking request sent", booking });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const getMyTutorBookings = async (req, res) => {
  try {
    const bookings = await TutorBooking.find({ tutor: req.user.id })
      .populate("student", "name email")
      .populate("studentProfile", "university degreeProgram year")
      .sort({ createdAt: -1 });

    const bookingIds = bookings.map((b) => b._id);
    const rooms = await StudyGroup.find({ tutorBooking: { $in: bookingIds } }).select("_id tutorBooking");
    const roomByBookingId = new Map(rooms.map((r) => [String(r.tutorBooking), String(r._id)]));

    // For accepted bookings with no linked room, create one on-the-fly
    const payload = await Promise.all(
      bookings.map(async (booking) => {
        const obj = booking.toObject();
        let studyGroupId = roomByBookingId.get(String(booking._id)) || null;

        if (!studyGroupId && booking.status === "accepted") {
          try {
            const tutorId = booking.tutor?._id || booking.tutor;
            const studentId = booking.student?._id || booking.student;
            const newRoom = await StudyGroup.create({
              name: `Tutoring: ${booking.student?.name || "Student"} & Tutor`,
              groupType: "tutoring",
              groupRequest: null,
              tutorBooking: booking._id,
              members: [
                { user: tutorId, role: "admin" },
                { user: studentId, role: "member" },
              ],
            });
            studyGroupId = String(newRoom._id);
          } catch (createErr) {
            // Unique key violation — room exists but wasn’t found by tutorBooking ref; find by members
            const fallback = await StudyGroup.findOne({
              groupType: "tutoring",
              "members.user": { $all: [booking.tutor?._id || booking.tutor, booking.student?._id || booking.student] },
            }).select("_id");
            studyGroupId = fallback ? String(fallback._id) : null;
          }
        }

        obj.studyGroupId = studyGroupId;
        return obj;
      })
    );

    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const respondToTutorBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { action } = req.body || {};

    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({ message: "Action must be accept or reject" });
    }

    const booking = await TutorBooking.findById(bookingId)
      .populate("student", "name email")
      .populate("tutor", "name email");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    if (String(booking.tutor) !== String(req.user.id) && String(booking.tutor?._id || booking.tutor) !== String(req.user.id)) {
      return res.status(403).json({ message: "Only the assigned tutor can respond to this booking" });
    }
    if (booking.status !== "pending") {
      return res.status(400).json({ message: `Booking already ${booking.status}` });
    }

    if (action === "reject") {
      booking.status = "rejected";
      await booking.save();
      return res.json({ message: "Booking rejected", booking });
    }

    booking.status = "accepted";
    await booking.save();

    let tutoringRoom = await StudyGroup.findOne({ tutorBooking: booking._id });
    if (!tutoringRoom) {
      const tutorId = booking.tutor?._id || booking.tutor;
      const studentId = booking.student?._id || booking.student;
      tutoringRoom = await StudyGroup.create({
        name: `Tutoring: ${booking.student?.name || "Student"} & ${booking.tutor?.name || "Tutor"}`,
        groupType: "tutoring",
        groupRequest: null,
        tutorBooking: booking._id,
        members: [
          { user: tutorId, role: "admin" },
          { user: studentId, role: "member" },
        ],
      });
    }

    return res.json({
      message: "Booking accepted and tutoring room created",
      booking,
      studyGroup: tutoringRoom,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /:bookingId/room — find or create the tutoring study group for an accepted booking
const getOrCreateChatRoom = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await TutorBooking.findById(bookingId)
      .populate("student", "name email")
      .populate("tutor", "name email");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const tutorUserId = booking.tutor?._id || booking.tutor;
    if (String(tutorUserId) !== String(req.user.id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (booking.status !== "accepted") {
      return res.status(400).json({ message: "Booking has not been accepted yet" });
    }

    // Try to find existing room first
    let room = await StudyGroup.findOne({ tutorBooking: booking._id });

    if (!room) {
      // Try to find by members in case tutorBooking ref is missing
      room = await StudyGroup.findOne({
        groupType: "tutoring",
        "members.user": tutorUserId,
        "members.user": booking.student?._id || booking.student,
      });
    }

    if (!room) {
      // Create the room now
      const studentUserId = booking.student?._id || booking.student;
      try {
        room = await StudyGroup.create({
          name: `Tutoring: ${booking.student?.name || "Student"} & ${booking.tutor?.name || "Tutor"}`,
          groupType: "tutoring",
          groupRequest: null,
          tutorBooking: booking._id,
          members: [
            { user: tutorUserId, role: "admin" },
            { user: studentUserId, role: "member" },
          ],
        });
      } catch (dupErr) {
        // Unique key race — try one more findOne
        room = await StudyGroup.findOne({ tutorBooking: booking._id });
        if (!room) {
          return res.status(500).json({ message: "Could not create or find chat room", error: dupErr.message });
        }
      }
    }

    return res.json({ studyGroupId: String(room._id) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createTutorBooking,
  getMyTutorBookings,
  respondToTutorBooking,
  getOrCreateChatRoom,
};

