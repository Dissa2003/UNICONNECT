const Payment = require("../models/Payment");
const TutorProfile = require("../models/TutorProfile");
const TutorBooking = require("../models/TutorBooking");
const StudentProfile = require("../models/StudentProfile");
const crypto = require("crypto");

/**
 * POST /api/payments/initiate
 * Student initiates a payment before booking a tutor.
 * Returns a payment record in "pending" state.
 */
const initiatePayment = async (req, res) => {
  try {
    const {
      tutorProfileId,
      hours,
      cardHolderName,
      cardLastFour,
    } = req.body || {};

    if (!tutorProfileId) {
      return res.status(400).json({ message: "Tutor profile ID is required" });
    }
    const parsedHours = parseFloat(hours);
    if (!parsedHours || parsedHours < 0.5) {
      return res.status(400).json({ message: "Minimum session duration is 0.5 hours" });
    }
    if (!cardLastFour || !/^\d{4}$/.test(String(cardLastFour))) {
      return res.status(400).json({ message: "Invalid card details" });
    }
    if (!cardHolderName || !String(cardHolderName).trim()) {
      return res.status(400).json({ message: "Card holder name is required" });
    }

    const tutorProfile = await TutorProfile.findById(tutorProfileId);
    if (!tutorProfile) {
      return res.status(404).json({ message: "Tutor profile not found" });
    }

    // Free tutors don't need payment
    if (tutorProfile.isFree || tutorProfile.hourlyRate === 0) {
      return res.status(400).json({ message: "This tutor is free — no payment required" });
    }

    const hourlyRate = Number(tutorProfile.hourlyRate);
    const totalAmount = Math.round(hourlyRate * parsedHours * 100) / 100;

    // Generate a unique transaction reference
    const transactionRef = `TXN-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    const payment = await Payment.create({
      student: req.user.id,
      tutor: tutorProfile.user,
      tutorProfile: tutorProfile._id,
      hourlyRate,
      hours: parsedHours,
      totalAmount,
      currency: "LKR",
      cardLastFour: String(cardLastFour),
      cardHolderName: String(cardHolderName).trim(),
      status: "pending",
      transactionRef,
    });

    return res.status(201).json({
      message: "Payment initiated",
      payment: {
        _id: payment._id,
        transactionRef: payment.transactionRef,
        totalAmount: payment.totalAmount,
        currency: payment.currency,
        status: payment.status,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/payments/:paymentId/confirm
 * Student confirms the payment (simulates gateway processing).
 * On success, creates the TutorBooking and links it to the Payment.
 */
const confirmPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const {
      studentProfileId,
      tutorProfileId,
      subject,
      learningStyle,
      language,
      requestedAvailability,
      matchScore,
      reasons,
    } = req.body || {};

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: "Payment record not found" });
    }
    if (String(payment.student) !== String(req.user.id)) {
      return res.status(403).json({ message: "Payment does not belong to this user" });
    }
    if (payment.status !== "pending") {
      return res.status(400).json({ message: `Payment already ${payment.status}` });
    }

    // Validate booking details
    if (!studentProfileId || !tutorProfileId) {
      return res.status(400).json({ message: "Student profile and tutor profile are required" });
    }

    const studentProfile = await StudentProfile.findById(studentProfileId);
    if (!studentProfile || String(studentProfile.user) !== String(req.user.id)) {
      return res.status(403).json({ message: "Invalid student profile" });
    }

    const tutorProfile = await TutorProfile.findById(tutorProfileId);
    if (!tutorProfile) {
      return res.status(404).json({ message: "Tutor profile not found" });
    }

    // Simulate payment processing — mark as completed
    payment.status = "completed";
    await payment.save();

    // Create the booking, using totalAmount as maxBudget
    const booking = await TutorBooking.create({
      student: req.user.id,
      studentProfile: studentProfile._id,
      tutor: tutorProfile.user,
      tutorProfile: tutorProfile._id,
      subject: String(subject || "").trim(),
      maxBudget: payment.totalAmount,
      learningStyle: String(learningStyle || "").trim(),
      language: String(language || "").trim(),
      requestedAvailability: requestedAvailability || {},
      matchScore: Math.max(0, Math.min(Number(matchScore) || 0, 1)),
      reasons: Array.isArray(reasons) ? reasons.slice(0, 10) : [],
      status: "pending",
    });

    // Link the booking back to the payment
    payment.tutorBooking = booking._id;
    await payment.save();

    return res.status(201).json({
      message: "Payment successful and booking request sent",
      payment: {
        _id: payment._id,
        transactionRef: payment.transactionRef,
        totalAmount: payment.totalAmount,
        currency: payment.currency,
        status: payment.status,
      },
      booking,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/payments/my
 * Returns all payments for the logged-in student.
 */
const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ student: req.user.id })
      .populate("tutor", "name email")
      .populate("tutorProfile", "firstName lastName hourlyRate subjectsYouTeach")
      .populate("tutorBooking", "subject status")
      .sort({ createdAt: -1 });
    return res.json(payments);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/payments/tutor/my
 * Returns all payments received by the logged-in tutor.
 */
const getTutorPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ tutor: req.user.id })
      .populate("student", "name email")
      .populate("tutorBooking", "subject status")
      .sort({ createdAt: -1 });
    return res.json(payments);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = {
  initiatePayment,
  confirmPayment,
  getMyPayments,
  getTutorPayments,
};
