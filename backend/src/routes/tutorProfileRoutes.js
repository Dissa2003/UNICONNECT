const express = require("express");
const router = express.Router();
const tutorProfileController = require("../controllers/tutorProfileController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.get(
  "/me",
  protect,
  authorize(["tutor"]),
  tutorProfileController.getMyTutorProfile
);

router.post(
  "/",
  protect,
  authorize(["tutor"]),
  tutorProfileController.upsertMyTutorProfile
);

module.exports = router;
