const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { protect, authorize } = require("../middleware/authMiddleware");
const userProfileController = require("../controllers/userProfileController");

// Admin: list all users
router.get(
  "/",
  protect,
  authorize(["admin"]),
  async (req, res) => {
    const users = await User.find().select("-password");
    res.json(users);
  }
);

// Authenticated user profile
router.get("/me", protect, userProfileController.getMe);
router.patch("/me", protect, userProfileController.updateMe);
router.patch("/me/password", protect, userProfileController.changePassword);
router.post(
  "/me/avatar",
  protect,
  userProfileController.uploadAvatarMiddleware,
  userProfileController.uploadAvatar
);

module.exports = router;
