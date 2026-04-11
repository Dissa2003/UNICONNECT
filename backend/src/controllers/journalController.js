const MoodJournal = require('../models/MoodJournal');

/**
 * @desc    Helper to detect stress level based on keywords
 * @param   {string} text 
 * @returns {string} LOW | MEDIUM | HIGH
 */
const detectStress = (text) => {
  const content = text.toLowerCase();
  
  const highKeywords = ['stressed', 'anxious', 'depressed', 'overwhelmed', 'panic', 'can\'t cope', 'exhausted'];
  const mediumKeywords = ['tired', 'busy', 'pressure', 'exams', 'deadline', 'worried', 'stress'];
  const lowKeywords = ['happy', 'relaxed', 'calm', 'good', 'great', 'fine'];

  // Check HIGH first as it takes precedence
  if (highKeywords.some(keyword => content.includes(keyword))) {
    return 'HIGH';
  }
  
  // Check MEDIUM
  if (mediumKeywords.some(keyword => content.includes(keyword))) {
    return 'MEDIUM';
  }

  // Default is LOW
  return 'LOW';
};

/**
 * @desc    Add a new mood journal entry with Smart Stress Detection
 * @route   POST /api/journal
 * @access  Private
 */
exports.addEntry = async (req, res) => {
  try {
    const { moodText } = req.body;

    if (!moodText || moodText.trim() === '') {
      return res.status(400).json({ success: false, message: 'Mood text is required' });
    }

    const stressLevel = detectStress(moodText);
    
    // Feedback messages mapping
    const feedbackMessages = {
      HIGH: "⚠️ High Stress Detected! Please take a break and use relaxation tools.",
      MEDIUM: "🟡 Medium Stress Detected! Try to manage workload and relax.",
      LOW: "🟢 Low Stress Detected! You are doing great!"
    };

    const entry = await MoodJournal.create({
      userId: req.user.id,
      moodText: moodText.trim(),
      stressLevel: stressLevel,
      message: feedbackMessages[stressLevel]
    });

    res.status(201).json({
      success: true,
      data: entry,
      message: feedbackMessages[stressLevel]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Get all journal entries for the user
 * @route   GET /api/journal
 * @access  Private
 */
exports.getEntries = async (req, res) => {
  try {
    const entries = await MoodJournal.find({ userId: req.user.id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: entries.length,
      data: entries
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Delete a journal entry
 * @route   DELETE /api/journal/:id
 * @access  Private
 */
exports.deleteEntry = async (req, res) => {
  try {
    const entry = await MoodJournal.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Entry not found' });
    }

    // Ensure user owns the entry
    if (entry.userId.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this entry' });
    }

    await entry.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Entry removed'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
