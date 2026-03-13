const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { protect, authorize } = require("../middleware/authMiddleware");

router.get(
  "/",
  protect,
  authorize(["admin"]),
  async (req, res) => {
    const users = await User.find().select("-password");
    res.json(users);
  }
);

module.exports = router;