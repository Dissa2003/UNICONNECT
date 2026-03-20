const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const StudentProfile = require("../models/StudentProfile");
const TutorProfile = require("../models/TutorProfile");

function sanitizeFaceDescriptor(rawDescriptor) {
  if (!Array.isArray(rawDescriptor)) {
    return [];
  }

  const numbers = rawDescriptor
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));

  return numbers;
}

function normalizeRole(rawRole) {
  if (typeof rawRole !== "string") {
    return null;
  }

  const role = rawRole.trim().toLowerCase();
  if (["student", "tutor", "admin"].includes(role)) {
    return role;
  }

  return null;
}

function getUserRoles(user) {
  const roles = Array.isArray(user.roles)
    ? user.roles.map((r) => normalizeRole(r)).filter(Boolean)
    : [];

  if (roles.length > 0) {
    return Array.from(new Set(roles));
  }

  const legacyRole = normalizeRole(user.role);
  return legacyRole ? [legacyRole] : [];
}

function userHasRole(user, role) {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) {
    return false;
  }

  return getUserRoles(user).includes(normalizedRole);
}

function signToken(userId, role, tokenVersion) {
  return jwt.sign(
    { id: userId, role, tokenVersion: tokenVersion || 0 },
    "secretkey",
    { expiresIn: "1d" }
  );
}

async function ensureProfileForRole(user, role, details) {
  if (role === "student") {
    const existingProfile = await StudentProfile.findOne({ user: user._id });
    if (!existingProfile) {
      await StudentProfile.create({
        user: user._id,
        name: user.name,
        email: user.email,
        university: details.university,
        degreeProgram: details.degreeProgram,
        year: details.year
      });
    }
    return;
  }

  if (role === "tutor") {
    const existingProfile = await TutorProfile.findOne({ user: user._id });
    if (!existingProfile) {
      await TutorProfile.create({
        user: user._id,
        firstName: details.firstName || "",
        lastName: details.lastName || "",
        personalEmail: user.email
      });
    }
  }
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
    const selectedRole = normalizeRole(role);

    if (!selectedRole || selectedRole === "admin") {
      return res.status(400).json({ message: "Please choose a valid role (student or tutor)" });
    }

    const sanitizedDescriptor = sanitizeFaceDescriptor(faceDescriptor);

    if (selectedRole === "tutor" && sanitizedDescriptor.length === 0) {
      return res.status(400).json({ message: "Face ID is required for tutor registration" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const isMatch = await bcrypt.compare(password, existingUser.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Email already registered with a different password" });
      }

      const roles = getUserRoles(existingUser);
      if (!roles.includes(selectedRole)) {
        roles.push(selectedRole);
      }

      existingUser.name = fullName;
      existingUser.role = selectedRole;
      existingUser.roles = roles;
      existingUser.university = university;
      existingUser.degreeProgram = degreeProgram;
      existingUser.year = year;

      if (sanitizedDescriptor.length > 0) {
        existingUser.faceAuth = {
          enabled: true,
          descriptor: sanitizedDescriptor,
          descriptorLength: sanitizedDescriptor.length,
          updatedAt: new Date()
        };
      }

      await existingUser.save();
      await ensureProfileForRole(existingUser, selectedRole, { firstName, lastName, university, degreeProgram, year });

      return res.status(200).json({
        message: `Role ${selectedRole} added successfully`,
        user: {
          id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
          roles: getUserRoles(existingUser),
          hasFaceId: Boolean(existingUser.faceAuth && existingUser.faceAuth.enabled)
        }
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: fullName,
      email,
      password: hashedPassword,
      role: selectedRole,
      roles: [selectedRole],
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

    await ensureProfileForRole(user, selectedRole, { firstName, lastName, university, degreeProgram, year });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        roles: getUserRoles(user),
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
    const { email, password, role } = req.body;
    const selectedRole = normalizeRole(role) || null;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const availableRoles = getUserRoles(user);
    const activeRole = selectedRole || normalizeRole(user.role) || availableRoles[0];

    if (!activeRole || !availableRoles.includes(activeRole)) {
      return res.status(403).json({
        message: "Selected role is not available for this account"
      });
    }

    if (user.role !== activeRole || !Array.isArray(user.roles) || user.roles.length === 0) {
      user.role = activeRole;
      user.roles = availableRoles;
      await user.save();
    }

    const token = signToken(user._id, activeRole, user.tokenVersion);

    res.json({
      message: "Login successful",
      token,
      role: activeRole,
      availableRoles
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// FACE LOGIN
exports.faceLogin = async (req, res) => {
  try {
    const { email, faceDescriptor, role } = req.body;
    const selectedRole = normalizeRole(role) || null;
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

      if (selectedRole && !userHasRole(user, selectedRole)) {
        return res.status(403).json({
          message: `This account is not registered as ${selectedRole}.`
        });
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
        if (selectedRole && !userHasRole(candidate, selectedRole)) {
          return;
        }

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

    const availableRoles = getUserRoles(matchedUser);
    const activeRole = selectedRole || normalizeRole(matchedUser.role) || availableRoles[0];

    if (!activeRole || !availableRoles.includes(activeRole)) {
      return res.status(403).json({ message: "Selected role is not available for this account" });
    }

    if (matchedUser.role !== activeRole || !Array.isArray(matchedUser.roles) || matchedUser.roles.length === 0) {
      matchedUser.role = activeRole;
      matchedUser.roles = availableRoles;
      await matchedUser.save();
    }

    const token = signToken(matchedUser._id, activeRole, matchedUser.tokenVersion);

    res.json({
      message: "Face login successful",
      token,
      role: activeRole,
      availableRoles,
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

exports.switchRole = async (req, res) => {
  try {
    const selectedRole = normalizeRole(req.body.role);
    if (!selectedRole) {
      return res.status(400).json({ message: "Please provide a valid role" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const availableRoles = getUserRoles(user);
    if (!availableRoles.includes(selectedRole)) {
      return res.status(403).json({ message: `Role ${selectedRole} is not available for this account` });
    }

    user.role = selectedRole;
    user.roles = availableRoles;
    await user.save();

    const token = signToken(user._id, selectedRole, user.tokenVersion);
    res.json({
      message: "Active role switched",
      token,
      role: selectedRole,
      availableRoles
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};