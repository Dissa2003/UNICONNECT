const StudentProfile = require("../models/StudentProfile");
const GroupRequest = require("../models/GroupRequest");
const { computeScore } = require("../services/matchingService");

function getMatchReasons(a, b) {
  const reasons = [];
  if (a.university && b.university && a.university === b.university) {
    reasons.push(`Same university: ${a.university}`);
  }
  if (a.degreeProgram && b.degreeProgram && a.degreeProgram === b.degreeProgram) {
    reasons.push(`Same degree program: ${a.degreeProgram}`);
  }
  if (a.learningStyle && b.learningStyle && a.learningStyle === b.learningStyle) {
    reasons.push(`Learning style match: ${a.learningStyle}`);
  }

  const commonSubjects = (a.subjects || []).filter((s) => (b.subjects || []).includes(s));
  if (commonSubjects.length) {
    reasons.push(`Common subjects: ${commonSubjects.slice(0, 3).join(", ")}`);
  }

  const commonSkills = (a.skills || []).filter((s) => (b.skills || []).includes(s));
  if (commonSkills.length) {
    reasons.push(`Common skills: ${commonSkills.slice(0, 3).join(", ")}`);
  }

  return reasons;
}

const getTopMatches = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await StudentProfile.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const allStudents = await StudentProfile.find(
      { _id: { $ne: studentId } },
      "name university degreeProgram year subjects skills learningStyle"
    );

    const scoredStudents = allStudents
      .map(s => ({
        student: s,
        score: computeScore(student, s),
        reasons: getMatchReasons(student, s),
      }))
      .filter(result => result.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    res.json(scoredStudents);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createGroupRequest = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { selectedStudentIds = [] } = req.body;

    if (!Array.isArray(selectedStudentIds) || selectedStudentIds.length < 1) {
      return res.status(400).json({ message: "Select at least 1 member" });
    }
    if (selectedStudentIds.length > 4) {
      return res.status(400).json({ message: "You can select up to 4 members" });
    }

    const requesterProfile = await StudentProfile.findById(studentId);
    if (!requesterProfile) {
      return res.status(404).json({ message: "Requester profile not found" });
    }
    if (String(requesterProfile.user) !== String(req.user.id)) {
      return res.status(403).json({ message: "You can only create requests from your own profile" });
    }

    const uniqueIds = [...new Set(selectedStudentIds.map(String))].filter((id) => id !== String(studentId));
    if (uniqueIds.length < 1) {
      return res.status(400).json({ message: "Please select valid members" });
    }
    if (uniqueIds.length > 4) {
      return res.status(400).json({ message: "You can select up to 4 members" });
    }

    const selectedProfiles = await StudentProfile.find({ _id: { $in: uniqueIds } });
    if (selectedProfiles.length !== uniqueIds.length) {
      return res.status(400).json({ message: "Some selected members are invalid" });
    }

    const invitees = selectedProfiles.map((p) => ({
      user: p.user,
      studentProfile: p._id,
      status: "pending",
      matchScore: computeScore(requesterProfile, p),
      reasons: getMatchReasons(requesterProfile, p),
    }));

    const requestDoc = await GroupRequest.create({
      requestedBy: req.user.id,
      requestedByProfile: requesterProfile._id,
      invitees,
      memberUserIds: [req.user.id, ...invitees.map((i) => i.user)],
      status: "pending",
    });

    return res.status(201).json({
      message: "Group request sent",
      request: requestDoc,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const getMyGroupRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const requests = await GroupRequest.find({
      $or: [{ requestedBy: userId }, { "invitees.user": userId }],
    })
      .populate("requestedBy", "name email")
      .populate("requestedByProfile", "name university degreeProgram")
      .populate("invitees.user", "name email")
      .populate("invitees.studentProfile", "name university degreeProgram")
      .sort({ createdAt: -1 });

    return res.json(requests);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const respondToGroupRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body;

    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({ message: "Action must be accept or reject" });
    }

    const requestDoc = await GroupRequest.findById(requestId);
    if (!requestDoc) {
      return res.status(404).json({ message: "Request not found" });
    }

    const idx = requestDoc.invitees.findIndex((i) => String(i.user) === String(req.user.id));
    if (idx === -1) {
      return res.status(403).json({ message: "You are not part of this request" });
    }

    if (action === "reject") {
      await GroupRequest.findByIdAndDelete(requestId);
      return res.json({ message: "Request rejected and removed" });
    }

    requestDoc.invitees[idx].status = "accepted";

    const allAccepted = requestDoc.invitees.every((i) => i.status === "accepted");
    if (allAccepted) {
      requestDoc.status = "grouped";
    }

    await requestDoc.save();
    return res.json({
      message: allAccepted ? "Group is now formed" : "Request accepted",
      request: requestDoc,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const deleteGroupRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const requestDoc = await GroupRequest.findById(requestId);
    if (!requestDoc) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (String(requestDoc.requestedBy) !== String(req.user.id)) {
      return res.status(403).json({ message: "Only the main requester can delete this request" });
    }

    await GroupRequest.findByIdAndDelete(requestId);
    return res.json({ message: "Request deleted" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getTopMatches,
  createGroupRequest,
  getMyGroupRequests,
  respondToGroupRequest,
  deleteGroupRequest,
};
