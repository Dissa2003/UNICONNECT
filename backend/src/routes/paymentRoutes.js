const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  initiatePayment,
  confirmPayment,
  getMyPayments,
  getTutorPayments,
} = require("../controllers/paymentController");

// Student: initiate a payment
router.post("/initiate", protect, authorize(["student"]), initiatePayment);

// Student: confirm payment + create booking
router.post("/:paymentId/confirm", protect, authorize(["student"]), confirmPayment);

// Student: get own payment history
router.get("/my", protect, authorize(["student"]), getMyPayments);

// Tutor: get received payments
router.get("/tutor/my", protect, authorize(["tutor"]), getTutorPayments);

module.exports = router;
