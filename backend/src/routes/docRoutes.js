const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const UserDoc = require('../models/UserDoc');
const { protect } = require('../middleware/authMiddleware');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// All routes require auth
router.use(protect);

// POST /api/docs/upload — upload a PDF to Cloudinary
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file provided' });
    const title = req.body.title || req.file.originalname.replace(/\.pdf$/i, '');

    const dataUri = `data:application/pdf;base64,${req.file.buffer.toString('base64')}`;
    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      folder: `uniconnect/docs/${req.user.id}`,
      resource_type: 'raw',
      public_id: `${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
    });

    const doc = await UserDoc.create({
      userId: req.user.id,
      title: title.trim(),
      fileUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      size: req.file.size,
    });

    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Upload failed' });
  }
});

// GET /api/docs — list user's documents
router.get('/', async (req, res) => {
  try {
    const docs = await UserDoc.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/docs/:id — delete from Cloudinary and DB
router.delete('/:id', async (req, res) => {
  try {
    const doc = await UserDoc.findOne({ _id: req.params.id, userId: req.user.id });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    await cloudinary.uploader.destroy(doc.publicId, { resource_type: 'raw' });
    await doc.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
