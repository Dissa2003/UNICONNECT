const StudyGroup = require("../models/StudyGroup");
const Message = require("../models/Message");
const GroupRequest = require("../models/GroupRequest");
const path = require("path");
const { getBotReply } = require("../services/botService");
const { ingestPdf, getUserPdfInfo, clearUserPdf } = require("../services/pdfService");

// ── Helper: check if user is member of a study group ──
async function assertMembership(groupId, userId) {
  const group = await StudyGroup.findById(groupId);
  if (!group) return { error: "Study group not found", status: 404 };
  const isMember = group.members.some(
    (m) => String(m.user) === String(userId)
  );
  if (!isMember) return { error: "Access denied – not a group member", status: 403 };
  return { group };
}

// GET /api/studyroom/my-groups
const getMyGroups = async (req, res) => {
  try {
    const groups = await StudyGroup.find({ "members.user": req.user.id })
      .populate("members.user", "name email")
      .sort({ createdAt: -1 });

    return res.json(groups);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/studyroom/:groupId/messages?before=<isoDate>&limit=50
const getMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const check = await assertMembership(groupId, req.user.id);
    if (check.error) return res.status(check.status).json({ message: check.error });

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const query = { group: groupId };
    if (req.query.before) {
      query.createdAt = { $lt: new Date(req.query.before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("sender", "name email");

    // return in chronological order, inject bot sender for bot messages
    const result = messages.reverse().map((m) => {
      const obj = m.toObject();
      if (obj.isBot && !obj.sender) {
        obj.sender = { _id: "bot", name: "@bot", email: "bot@uniconnect" };
      }
      return obj;
    });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/studyroom/:groupId/messages  (text message via REST fallback)
const sendMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Message content is required" });
    }

    const check = await assertMembership(groupId, req.user.id);
    if (check.error) return res.status(check.status).json({ message: check.error });

    const msg = await Message.create({
      group: groupId,
      sender: req.user.id,
      type: "text",
      content: content.trim(),
    });

    const populated = await msg.populate("sender", "name email");

    // also broadcast via socket if available
    const io = req.app.get("io");
    if (io) {
      io.to(groupId).emit("new-message", populated);
    }

    // ── @bot trigger (REST fallback) ──
    if (content.trim().toLowerCase().startsWith("@bot")) {
      const prompt = content.trim().substring(4).trim();
      if (prompt) {
        const reply = await getBotReply(prompt);
        if (reply) {
          const botMsg = await Message.create({
            group: groupId,
            sender: null,
            isBot: true,
            type: "text",
            content: reply,
          });
          const botPopulated = botMsg.toObject();
          botPopulated.sender = { _id: "bot", name: "@bot", email: "bot@uniconnect" };
          if (io) io.to(groupId).emit("new-message", botPopulated);
        }
      }
    }

    return res.status(201).json(populated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/studyroom/:groupId/upload  (file upload)
const uploadFile = async (req, res) => {
  try {
    const { groupId } = req.params;

    const check = await assertMembership(groupId, req.user.id);
    if (check.error) return res.status(check.status).json({ message: check.error });

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const msg = await Message.create({
      group: groupId,
      sender: req.user.id,
      type: "file",
      content: "",
      fileName: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      fileSize: req.file.size,
    });

    const populated = await msg.populate("sender", "name email");

    const io = req.app.get("io");
    if (io) {
      io.to(groupId).emit("new-message", populated);
    }

    return res.status(201).json(populated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/studyroom/:groupId/members
const getGroupMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const check = await assertMembership(groupId, req.user.id);
    if (check.error) return res.status(check.status).json({ message: check.error });

    const group = await StudyGroup.findById(groupId).populate(
      "members.user",
      "name email"
    );

    return res.json({
      name: group.name,
      members: group.members,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/studyroom/ref-upload  – upload PDF for Reference Flow
const refUploadPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ message: "Only PDF files are allowed" });
    }

    const result = await ingestPdf(
      req.user.id,
      req.file.path,
      req.file.originalname
    );

    return res.json({
      message: "PDF processed successfully",
      fileName: result.fileName,
      totalChunks: result.totalChunks,
      pages: result.pages,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/studyroom/ref-info  – check if user has a PDF loaded
const refGetInfo = async (req, res) => {
  const info = getUserPdfInfo(req.user.id);
  if (!info) return res.json({ loaded: false });
  return res.json({
    loaded: true,
    fileName: info.fileName,
    totalChunks: info.chunks.length,
  });
};

// DELETE /api/studyroom/ref-clear  – clear user's PDF
const refClear = async (req, res) => {
  clearUserPdf(req.user.id);
  return res.json({ message: "PDF cleared" });
};

module.exports = {
  getMyGroups,
  getMessages,
  sendMessage,
  uploadFile,
  getGroupMembers,
  refUploadPdf,
  refGetInfo,
  refClear,
};
