/**
 * Journal Routes
 * 
 * Defines the API endpoints for managing mood journal entries.
 * All routes are protected and require a valid user authentication token.
 */
const express = require('express');
const router = express.Router();
const { addEntry, getEntries, deleteEntry } = require('../controllers/journalController');
const { protect } = require('../middleware/authMiddleware');

// Apply the protect middleware to all routes in this router
// Ensures only authenticated users can access their journal entries
router.use(protect);

// Route: /api/journal
// POST: Create a new mood journal entry
// GET: Retrieve all journal entries for the logged-in user
router.route('/')
  .post(addEntry)
  .get(getEntries);

// Route: /api/journal/:id
// DELETE: Remove a specific journal entry by its ID
router.route('/:id')
  .delete(deleteEntry);

module.exports = router;
