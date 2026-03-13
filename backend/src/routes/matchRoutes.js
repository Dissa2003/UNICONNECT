const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getTopMatches,
  createGroupRequest,
  getMyGroupRequests,
  respondToGroupRequest,
} = require("../controllers/matchController");

router.get("/:studentId/top-matches", protect, getTopMatches);
router.post("/:studentId/request-group", protect, createGroupRequest);
router.get("/group-requests/me", protect, getMyGroupRequests);
router.patch("/group-requests/:requestId/respond", protect, respondToGroupRequest);

module.exports = router;
