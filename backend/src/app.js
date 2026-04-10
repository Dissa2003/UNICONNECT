const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const express = require("express");
const http = require("http");
const cors = require("cors");
const connectDB = require("./config/db");
const { initSocket } = require("./socket");

let profileRoutes, matchRoutes, tutorProfileRoutes, studyRoomRoutes, tutorBookingRoutes, stressRoutes, journalRoutes;

try {
  profileRoutes = require("./routes/profileRoutes");
  console.log("✓ profileRoutes loaded");
} catch (err) {
  console.error("✗ Error loading profileRoutes:", err.message);
}

try {
  matchRoutes = require("./routes/matchRoutes");
  console.log("✓ matchRoutes loaded");
} catch (err) {
  console.error("✗ Error loading matchRoutes:", err.message);
}

try {
  tutorProfileRoutes = require("./routes/tutorProfileRoutes");
  console.log("✓ tutorProfileRoutes loaded");
} catch (err) {
  console.error("✗ Error loading tutorProfileRoutes:", err.message);
}

try {
  studyRoomRoutes = require("./routes/studyRoomRoutes");
  console.log("✓ studyRoomRoutes loaded");
} catch (err) {
  console.error("✗ Error loading studyRoomRoutes:", err.message);
}

try {
  tutorBookingRoutes = require("./routes/tutorBookingRoutes");
  console.log("✓ tutorBookingRoutes loaded");
} catch (err) {
  console.error("✗ Error loading tutorBookingRoutes:", err.message);
}

try {
  stressRoutes = require("./routes/stressRoutes");
  console.log("✓ stressRoutes loaded");
} catch (err) {
  console.error("✗ Error loading stressRoutes:", err.message);
}

try {
  journalRoutes = require("./routes/journalRoutes");
  console.log("✓ journalRoutes loaded");
} catch (err) {
  console.error("✗ Error loading journalRoutes:", err.message);
}

const app = express();
const server = http.createServer(app);

// Initialise Socket.io and store the instance on the app so controllers can broadcast
const io = initSocket(server);
app.set("io", io);

app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// THIS LINE MAKES /api/profile/create WORK
app.use("/api/profile", profileRoutes);
if (tutorProfileRoutes) {
  app.use("/api/tutor-profile", tutorProfileRoutes);
}

// authentication and user management
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));

// Only register match routes if successfully loaded
if (matchRoutes) {
  app.use("/api/match", matchRoutes);
}

// Study room / group chat routes
if (studyRoomRoutes) {
  app.use("/api/studyroom", studyRoomRoutes);
}

if (tutorBookingRoutes) {
  app.use("/api/tutor-bookings", tutorBookingRoutes);
}

if (stressRoutes) {
  app.use("/api/stress", stressRoutes);
}

if (journalRoutes) {
  app.use("/api/journal", journalRoutes);
}

server.listen(5000, async () => {
  try {
    await connectDB();
    console.log("Matching Engine running on 5000 (with Socket.io)");
  } catch (err) {
    console.error("Failed to connect to DB:", err.message);
    process.exit(1);
  }
});
