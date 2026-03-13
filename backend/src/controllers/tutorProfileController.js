const TutorProfile = require("../models/TutorProfile");

exports.getMyTutorProfile = async (req, res) => {
  try {
    const profile = await TutorProfile.findOne({ user: req.user.id });
    if (!profile) {
      return res.status(404).json({ message: "Tutor profile not found" });
    }
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.upsertMyTutorProfile = async (req, res) => {
  try {
    const payload = { ...req.body, user: req.user.id };
    const profile = await TutorProfile.findOneAndUpdate(
      { user: req.user.id },
      payload,
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
