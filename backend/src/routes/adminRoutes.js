const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getAllUsers,
  getAllTutors,
  getAllGroups,
  getAllPayments,
  getAllBookings,
  getStats,
} = require("../controllers/adminController");

const adminOnly = [protect, authorize(["admin"])];

router.get("/stats",    ...adminOnly, getStats);
router.get("/users",    ...adminOnly, getAllUsers);
router.get("/tutors",   ...adminOnly, getAllTutors);
router.get("/groups",   ...adminOnly, getAllGroups);
router.get("/payments", ...adminOnly, getAllPayments);
router.get("/bookings", ...adminOnly, getAllBookings);

module.exports = router;
