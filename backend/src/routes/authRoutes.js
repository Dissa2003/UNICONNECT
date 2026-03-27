const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/face-login", authController.faceLogin);
router.post("/switch-role", protect, authController.switchRole);
router.post("/logout", protect, authController.logout);
router.get("/face-status", protect, authController.getFaceStatus);
router.post("/update-face", protect, authController.updateFace);

module.exports = router;