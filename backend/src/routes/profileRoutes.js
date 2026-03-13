const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profileController");
const { protect, authorize } = require("../middleware/authMiddleware");

// create profile - only students may create one, must be authenticated
router.post(
	"/",
	protect,
	authorize(["student"]),
	profileController.createProfile
);

// get current user's profile (students)
router.get(
    "/me",
    protect,
    authorize(["student"]),
    profileController.getProfile
);

// update profile - PUT method for explicit updates
router.put(
	"/",
	protect,
	authorize(["student"]),
	profileController.updateProfile
);

// secure delete profile via password or face verification
router.post(
	"/delete-secure",
	protect,
	authorize(["student"]),
	profileController.deleteProfileSecure
);

// delete profile
router.delete(
	"/",
	protect,
	authorize(["student"]),
	profileController.deleteProfile
);

module.exports = router;
