const User = require("../models/User");
const TutorProfile = require("../models/TutorProfile");
const StudentProfile = require("../models/StudentProfile");
const StudyGroup = require("../models/StudyGroup");
const TutorBooking = require("../models/TutorBooking");
const Payment = require("../models/Payment");

// GET /api/admin/users  — all registered users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select("-password -faceAuth.descriptor")
      .sort({ createdAt: -1 })
      .lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/tutors  — all tutor profiles
exports.getAllTutors = async (req, res) => {
  try {
    const tutors = await TutorProfile.find({})
      .populate("user", "name email role createdAt")
      .sort({ createdAt: -1 })
      .lean();
    res.json(tutors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/groups  — all study groups
exports.getAllGroups = async (req, res) => {
  try {
    const groups = await StudyGroup.find({})
      .populate("members.user", "name email")
      .sort({ createdAt: -1 })
      .lean();
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/payments  — all payment records
exports.getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find({})
      .populate("student", "name email")
      .populate("tutor", "name email")
      .sort({ createdAt: -1 })
      .lean();
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/bookings  — all tutor bookings (grouped teachers & students)
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await TutorBooking.find({})
      .populate("student", "name email")
      .populate("tutor", "name email")
      .populate("tutorProfile", "firstName lastName subjectsYouTeach hourlyRate isFree")
      .populate("studentProfile", "name university degreeProgram year")
      .sort({ createdAt: -1 })
      .lean();
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/stats  — summary counts
exports.getStats = async (req, res) => {
  try {
    const [userCount, tutorCount, studentCount, groupCount, paymentCount, bookingCount, totalRevenue] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ $or: [{ role: "tutor" }, { roles: "tutor" }] }),
      User.countDocuments({ $or: [{ role: "student" }, { roles: "student" }] }),
      StudyGroup.countDocuments({}),
      Payment.countDocuments({ status: "completed" }),
      TutorBooking.countDocuments({}),
      Payment.aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } }
      ])
    ]);
    res.json({
      userCount,
      tutorCount,
      studentCount,
      groupCount,
      paymentCount,
      bookingCount,
      totalRevenue: totalRevenue[0]?.total || 0
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
