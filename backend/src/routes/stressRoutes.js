const express = require('express');
const router = express.Router();
// Use require to jump out of 'src/routes' to reach 'stress_detector'
const { predictStressLevel } = require('../../stress_detector/predictor');

router.post('/predict', async (req, res) => {
    try {
        const { answers } = req.body; // Expecting an array of 20 numbers

        if (!answers || answers.length !== 20) {
            return res.status(400).json({ 
                error: "Invalid input. Exactly 20 features are required." 
            });
        }

        const result = await predictStressLevel(answers);

        if (result === null) {
            return res.status(500).json({ error: "Prediction failed at the model level." });
        }

        res.status(200).json({
            success: true,
            stress_level: result.index,
            stress_label: result.label
        });

    } catch (err) {
        res.status(500).json({ error: "Server error occurred during analysis." });
    }
});

module.exports = router;