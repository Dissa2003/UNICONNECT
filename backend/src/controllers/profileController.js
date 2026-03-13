// src/controllers/profileController.js
const StudentProfile = require("../models/StudentProfile");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

// helper to make sure strong/weak subjects stay within the main subjects list
function sanitizeSubjectArrays(obj) {
  if (obj.subjects) {
    const subs = obj.subjects || [];
    if (obj.strongSubjects) {
      obj.strongSubjects = obj.strongSubjects.filter(s => subs.includes(s));
    }
    if (obj.weakSubjects) {
      obj.weakSubjects = obj.weakSubjects.filter(s => subs.includes(s));
    }
  }
  return obj;
}

// return error if strong/weak subjects reference missing subjects
function validateSubjectSubset(obj) {
  const errors = [];
  if (obj.strongSubjects && obj.subjects) {
    const invalid = obj.strongSubjects.filter(s => !obj.subjects.includes(s));
    if (invalid.length) {
      errors.push(`strongSubjects must be subset of subjects: ${invalid.join(', ')}`);
    }
  }
  if (obj.weakSubjects && obj.subjects) {
    const invalid = obj.weakSubjects.filter(s => !obj.subjects.includes(s));
    if (invalid.length) {
      errors.push(`weakSubjects must be subset of subjects: ${invalid.join(', ')}`);
    }
  }
  return errors;
}

function sanitizeFaceDescriptor(rawDescriptor) {
  if (!Array.isArray(rawDescriptor)) {
    return [];
  }

  return rawDescriptor
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
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

exports.createProfile = async (req, res) => {
  try {
    // Check if profile already exists - if so, update it instead
    let profile = await StudentProfile.findOne({ user: req.user.id });
    
    if (profile) {
      // when updating via POST, make sure new strong/weak subjects agree with
      // the final subjects list (existing plus any added subjects in body)
      const currentSubs = profile.subjects || [];
      const newSubs = req.body.subjects || currentSubs;
      const strong = req.body.strongSubjects || profile.strongSubjects || [];
      const weak = req.body.weakSubjects || profile.weakSubjects || [];
      console.log('DEBUG createProfile upsert - currentSubs', currentSubs, 'newSubs', newSubs, 'strong', strong, 'weak', weak);
      const errors = [];
      const invalidStrong = strong.filter(s => !newSubs.includes(s));
      if (invalidStrong.length) errors.push(`strongSubjects must be subset of subjects: ${invalidStrong.join(', ')}`);
      const invalidWeak = weak.filter(s => !newSubs.includes(s));
      if (invalidWeak.length) errors.push(`weakSubjects must be subset of subjects: ${invalidWeak.join(', ')}`);
      if (errors.length) {
        console.log('DEBUG validation errors', errors);
        return res.status(400).json({ message: errors.join('; ') });
      }
      // Update existing profile
      sanitizeSubjectArrays(req.body);
      Object.assign(profile, req.body);
      await profile.save();
      return res.json(profile);
    }

    // Create new profile; prefer name from request body, otherwise use authenticated user's name
    // Validate
    const initial = { ...req.body };
    const err = validateSubjectSubset(initial);
    if (err.length) {
      return res.status(400).json({ message: err.join('; ') });
    }
    const payload = sanitizeSubjectArrays({
      ...req.body,
      name: req.body.name || (req.user && req.user.name) || undefined,
      user: req.user.id
    });
    profile = await StudentProfile.create(payload);

    res.status(201).json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// return the profile belonging to the authenticated user
exports.getProfile = async (req, res) => {
  try {
    // populate user name so frontend can display the student's actual name
    const profile = await StudentProfile.findOne({ user: req.user.id }).populate('user', 'name');
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // prefer explicit profile.name, fallback to populated user.name
    const displayName = profile.name || (profile.user && profile.user.name) || '';
    const out = profile.toObject();
    out.displayName = displayName;

    // ensure availability is always a plain object; migrate if we still have the old array format
    if (Array.isArray(profile.availability)) {
      const obj = {};
      profile.availability.forEach(d => {
        const day = d.day;
        (d.timeSlots || []).forEach(t => {
          obj[`${day}-${t}`] = true;
        });
      });
      profile.availability = obj;
      await profile.save();
      out.availability = obj;
    } else if (out.availability && typeof out.availability.toObject === 'function') {
      out.availability = out.availability.toObject();
    }

    res.json(out);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// update a specific field (partial update)
exports.updateProfile = async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ user: req.user.id });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // determine effective subjects list for validation
    const currentSubs = profile.subjects || [];
    const newSubs = req.body.subjects || currentSubs;
    const strong = req.body.strongSubjects || profile.strongSubjects || [];
    const weak = req.body.weakSubjects || profile.weakSubjects || [];
    const errors = [];
    const invalidStrong = strong.filter(s => !newSubs.includes(s));
    if (invalidStrong.length) errors.push(`strongSubjects must be subset of subjects: ${invalidStrong.join(', ')}`);
    const invalidWeak = weak.filter(s => !newSubs.includes(s));
    if (invalidWeak.length) errors.push(`weakSubjects must be subset of subjects: ${invalidWeak.join(', ')}`);
    if (errors.length) {
      return res.status(400).json({ message: errors.join('; ') });
    }

    const updates = sanitizeSubjectArrays(req.body);
    const updatedProfile = await StudentProfile.findOneAndUpdate(
      { user: req.user.id },
      updates,
      { new: true, runValidators: false }
    );
    res.json(updatedProfile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// delete a profile
exports.deleteProfile = async (req, res) => {
  try {
    const profile = await StudentProfile.findOneAndDelete({ user: req.user.id });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }
    res.json({ message: "Profile deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// delete profile only after password or face verification
exports.deleteProfileSecure = async (req, res) => {
  try {
    const { password, faceDescriptor } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let verified = false;

    if (typeof password === "string" && password.trim().length > 0) {
      verified = await bcrypt.compare(password, user.password);
    } else if (Array.isArray(faceDescriptor) && faceDescriptor.length > 0) {
      const incomingDescriptor = sanitizeFaceDescriptor(faceDescriptor);
      const storedDescriptor = sanitizeFaceDescriptor(user.faceAuth && user.faceAuth.descriptor);
      const threshold = Number(process.env.FACE_LOGIN_THRESHOLD || 0.88);

      if (!incomingDescriptor.length || !storedDescriptor.length || incomingDescriptor.length !== storedDescriptor.length) {
        return res.status(400).json({ message: "Face ID is not enrolled or invalid" });
      }

      const score = cosineSimilarity(incomingDescriptor, storedDescriptor);
      verified = score >= threshold;
    } else {
      return res.status(400).json({ message: "Provide password or Face ID" });
    }

    if (!verified) {
      return res.status(401).json({ message: "Verification failed" });
    }

    const profile = await StudentProfile.findOneAndDelete({ user: req.user.id });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json({ message: "Profile deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

