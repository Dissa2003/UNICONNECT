require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

let profileRoutes, matchRoutes, tutorProfileRoutes;

try {
  profileRoutes = require("./routes/profileRoutes");
  console.log("✓ profileRoutes loaded, type:", typeof profileRoutes, "is router?", typeof profileRoutes.use === 'function');
} catch (err) {
  console.error("✗ Error loading profileRoutes:", err.message);
  console.error(err.stack);
}

try {
  matchRoutes = require("./routes/matchRoutes");
  console.log("✓ matchRoutes loaded, type:", typeof matchRoutes, "is router?", typeof matchRoutes.use === 'function');
} catch (err) {
  console.error("✗ Error loading matchRoutes:", err.message);
  console.error(err.stack);
}

try {
  tutorProfileRoutes = require("./routes/tutorProfileRoutes");
  console.log("✓ tutorProfileRoutes loaded, type:", typeof tutorProfileRoutes, "is router?", typeof tutorProfileRoutes.use === 'function');
} catch (err) {
  console.error("✗ Error loading tutorProfileRoutes:", err.message);
  console.error(err.stack);
}

const app = express();

app.use(cors());
app.use(express.json());


// Normalize URL: strip trailing newline/CR encodings that some clients append (%0A/%0D)
// (disabled for debugging 404 issue)
/*
app.use((req, res, next) => {
	try {
		req.url = req.url.replace(/(%0A|%0D|\r|\n)+$/i, '');
	} catch (e) {
		// fallback: leave URL unchanged
	}
	next();
});
*/

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

app.listen(5000, async () => {
  try {
    await connectDB();
    console.log("Matching Engine running on 5000");
  } catch (err) {
    console.error("Failed to connect to DB:", err.message);
    process.exit(1);
  }
});
