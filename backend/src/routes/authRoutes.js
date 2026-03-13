const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/face-login", authController.faceLogin);
router.post("/logout", protect, authController.logout);

module.exports = router;