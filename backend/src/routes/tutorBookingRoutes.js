const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  createTutorBooking,
  getMyTutorBookings,
  respondToTutorBooking,
  getOrCreateChatRoom,
} = require("../controllers/tutorBookingController");

router.post("/", protect, authorize(["student"]), createTutorBooking);
router.get("/tutor/me", protect, authorize(["tutor"]), getMyTutorBookings);
router.get("/:bookingId/room", protect, authorize(["tutor"]), getOrCreateChatRoom);
router.patch("/:bookingId/respond", protect, authorize(["tutor"]), respondToTutorBooking);

module.exports = router;
