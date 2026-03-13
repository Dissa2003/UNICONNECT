const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

function sanitizeFaceDescriptor(rawDescriptor) {
  if (!Array.isArray(rawDescriptor)) {
    return [];
  }

  const numbers = rawDescriptor
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));

  return numbers;
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (!denom) {
    return 0;
  }

  return dot / denom;
}

// REGISTER
exports.register = async (req, res) => {
  try {
    const { name, firstName, lastName, email, password, role, university, degreeProgram, year, faceDescriptor } = req.body;
    const fullName = (name || `${firstName || ""} ${lastName || ""}`.trim() || "User").trim();

    // check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const sanitizedDescriptor = sanitizeFaceDescriptor(faceDescriptor);

    if (role === 'tutor' && sanitizedDescriptor.length === 0) {
      return res.status(400).json({ message: 'Face ID is required for tutor registration' });
    }

    const user = await User.create({
      name: fullName,
      email,
      password: hashedPassword,
      role,
      faceAuth: {
        enabled: sanitizedDescriptor.length > 0,
        descriptor: sanitizedDescriptor,
        descriptorLength: sanitizedDescriptor.length,
        updatedAt: sanitizedDescriptor.length > 0 ? new Date() : null
      },
      university,
      degreeProgram,
      year
    });

    // if the new user is a student, create a blank profile populated with these basics
    if (role === 'student') {
      const StudentProfile = require('../models/StudentProfile');
      await StudentProfile.create({
        user: user._id,
        name: fullName,
        email,
        university,
        degreeProgram,
        year
      });
    } else if (role === 'tutor') {
      const TutorProfile = require('../models/TutorProfile');
      await TutorProfile.create({
        user: user._id,
        firstName: firstName || '',
        lastName: lastName || '',
        personalEmail: email
      });
    }

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hasFaceId: Boolean(user.faceAuth && user.faceAuth.enabled)
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, tokenVersion: user.tokenVersion || 0 },
      "secretkey",
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      role: user.role
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// FACE LOGIN
exports.faceLogin = async (req, res) => {
  try {
    const { email, faceDescriptor } = req.body;
    const threshold = Number(process.env.FACE_LOGIN_THRESHOLD || 0.88);

    const incomingDescriptor = sanitizeFaceDescriptor(faceDescriptor);
    if (incomingDescriptor.length === 0) {
      return res.status(400).json({ message: "Face descriptor is required" });
    }

    let matchedUser = null;
    let score = 0;

    if (email) {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: "Invalid face credentials" });
      }

      if (!user.faceAuth || !user.faceAuth.enabled || !Array.isArray(user.faceAuth.descriptor) || user.faceAuth.descriptor.length === 0) {
        return res.status(400).json({ message: "Face ID is not enrolled for this account" });
      }

      matchedUser = user;
      score = cosineSimilarity(incomingDescriptor, user.faceAuth.descriptor);
    } else {
      const candidates = await User.find({
        "faceAuth.enabled": true,
        "faceAuth.descriptorLength": incomingDescriptor.length
      });

      if (!candidates.length) {
        return res.status(400).json({ message: "No enrolled face profiles found" });
      }

      candidates.forEach((candidate) => {
        const candidateScore = cosineSimilarity(incomingDescriptor, candidate.faceAuth.descriptor || []);
        if (candidateScore > score) {
          score = candidateScore;
          matchedUser = candidate;
        }
      });
    }

    if (!matchedUser) {
      return res.status(400).json({ message: "Face verification failed" });
    }

    if (score < threshold) {
      return res.status(400).json({
        message: "Face verification failed",
        confidence: Number(score.toFixed(4))
      });
    }

    const token = jwt.sign(
      { id: matchedUser._id, role: matchedUser.role, tokenVersion: matchedUser.tokenVersion || 0 },
      "secretkey",
      { expiresIn: "1d" }
    );

    res.json({
      message: "Face login successful",
      token,
      role: matchedUser.role,
      email: matchedUser.email,
      confidence: Number(score.toFixed(4))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// LOGOUT (invalidates current token by bumping tokenVersion)
exports.logout = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};