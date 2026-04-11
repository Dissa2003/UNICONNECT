const express = require('express');
const router = express.Router();
const { addEntry, getEntries, deleteEntry } = require('../controllers/journalController');
const { protect } = require('../middleware/authMiddleware');

// All journal routes are protected
router.use(protect);

router.route('/')
  .post(addEntry)
  .get(getEntries);

router.route('/:id')
  .delete(deleteEntry);

module.exports = router;
