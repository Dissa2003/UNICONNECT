/**
 * Stress Routes
 * 
 * Defines the API endpoints for the ML-powered stress prediction and history tracking.
 * Includes routes for predicting stress levels from a 20-question survey,
 * and retrieving/clearing the authenticated user's stress history.
 */
const express = require('express');
const router = express.Router();
const { predictStressLevel } = require('../../stress_detector/predictor');
const { protect } = require('../middleware/authMiddleware');
const StressHistory = require('../models/StressHistory');

/**
 * Helper Function: computeStressScore
 * 
 * Derives a 0-100 stress score from the 20 questionnaire answers.
 * - Positive factors (e.g., anxiety, workload): Higher value = more stress.
 * - Protective factors (e.g., sleep, social support): Higher value = less stress (inverted).
 * 
 * @param {Array<number>} a - Array of 20 numerical answers.
 * @returns {number} A calculated score between 0 and 100.
 */
function computeStressScore(a) {
    const positive = [
        a[0] / 21,           // anxiety        (0-21)
        a[2],                // mental health   (0-1)
        a[3] / 27,           // depression      (0-27)
        a[4] / 5,            // headaches       (0-5)
        (a[5] - 1) / 2,      // blood pressure  (1-3 → 0-1)
        a[7] / 5,            // breathing probs (0-5)
        a[8] / 5,            // noise level     (0-5)
        a[13] / 5,           // workload        (0-5)
        a[15] / 5,           // career concern  (0-5)
        a[17] / 5,           // peer pressure   (0-5)
        a[19] / 5,           // bullying        (0-5)
    ];
    const protective = [
        a[1] / 30,           // self-esteem     (0-30)
        a[6] / 5,            // sleep quality   (0-5)
        a[9] / 5,            // living cond.    (0-5)
        a[10] / 5,           // safety          (0-5)
        a[11] / 5,           // basic needs     (0-5)
        a[12] / 5,           // academic perf.  (0-5)
        a[14] / 5,           // teacher rel.    (0-5)
        a[16] / 3,           // social support  (0-3)
        a[18] / 5,           // extracurricular (0-5)
    ];

    const avgPos  = positive.reduce((s, v) => s + v, 0)  / positive.length;
    const avgProt = protective.reduce((s, v) => s + v, 0) / protective.length;
    const raw = avgPos * 0.65 + (1 - avgProt) * 0.35;
    return Math.round(Math.min(100, Math.max(0, raw * 100)));
}

// POST /api/stress/predict
// Predicts stress level based on 20 survey answers.
// Authentication is optional: if a valid token is provided, the record is saved to history.
router.post('/predict', async (req, res) => {
    try {
        const { answers } = req.body;

        if (!answers || answers.length !== 20) {
            return res.status(400).json({
                error: 'Invalid input. Exactly 20 features are required.'
            });
        }

        const result = await predictStressLevel(answers);
        if (result === null) {
            return res.status(500).json({ error: 'Prediction failed at the model level.' });
        }

        const score = computeStressScore(answers);

        // Save record if a valid JWT is provided (non-blocking for the response)
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(authHeader.split(' ')[1], 'secretkey');
                if (decoded && decoded.id) {
                    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
                    await StressHistory.create({
                        userId: decoded.id,
                        date:   today,
                        score,
                        level:  result.label,
                    });
                }
            } catch (_) {
                // Invalid token is acceptable here — prediction still returns
            }
        }

        res.status(200).json({
            success:      true,
            stress_level: result.index,
            stress_label: result.label,
            score,
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error occurred during analysis.' });
    }
});

// GET /api/stress/history
// Retrieves the authenticated user's stress history records, sorted newest first.
router.get('/history', protect, async (req, res) => {
    try {
        const records = await StressHistory
            .find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .lean();
        res.status(200).json({ success: true, records });
    } catch (err) {
        res.status(500).json({ error: 'Could not retrieve stress history.' });
    }
});

// DELETE /api/stress/history
// Clears all stress history records for the authenticated user.
router.delete('/history', protect, async (req, res) => {
    try {
        await StressHistory.deleteMany({ userId: req.user.id });
        res.status(200).json({ success: true, message: 'History cleared.' });
    } catch (err) {
        res.status(500).json({ error: 'Could not clear stress history.' });
    }
});

module.exports = router;