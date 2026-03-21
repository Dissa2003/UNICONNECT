const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const { protect } = require("../middleware/authMiddleware");
const {
  getMyGroups,
  getMessages,
  sendMessage,
  uploadFile,
  getGroupMembers,
  refUploadPdf,
  refGetInfo,
  refClear,
} = require("../controllers/studyRoomController");

// ── Multer config ──
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, "../../uploads"));
  },
  filename: (_req, file, cb) => {
    const unique = crypto.randomBytes(8).toString("hex");
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
];

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("File type not allowed"), false);
    }
  },
});

router.get("/my-groups", protect, getMyGroups);
router.get("/ref-info", protect, refGetInfo);
router.post("/ref-upload", protect, upload.single("file"), refUploadPdf);
router.delete("/ref-clear", protect, refClear);
router.get("/:groupId/messages", protect, getMessages);
router.post("/:groupId/messages", protect, sendMessage);
router.post("/:groupId/upload", protect, upload.single("file"), uploadFile);
router.get("/:groupId/members", protect, getGroupMembers);

module.exports = router;
