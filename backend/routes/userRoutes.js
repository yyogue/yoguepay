const express = require("express");
const User = require("../models/User");
const upload = require("../config/multer"); // For profile picture uploads
const router = express.Router();

// ✅ Get User Profile by UID (View Profile)
router.get("/:uid", async (req, res) => {
  console.log("🔍 Fetching profile for:", req.params.uid);

  try {
    const user = await User.findOne({ firebaseUID: req.params.uid });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("❌ Profile Fetch Error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Update User Profile (Name, Username, Country)
router.put("/:uid", async (req, res) => {
  console.log("📝 Updating profile for:", req.params.uid, req.body);

  try {
    const updatedUser = await User.findOneAndUpdate(
      { firebaseUID: req.params.uid },
      { $set: req.body },
      { new: true } // Return updated user
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log("✅ Profile updated:", updatedUser);
    res.status(200).json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    console.error("❌ Profile Update Error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Update Profile Picture
router.put("/:uid/profile-picture", upload.single("profilePicture"), async (req, res) => {
  console.log("📸 Updating profile picture for:", req.params.uid);

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const updatedUser = await User.findOneAndUpdate(
      { firebaseUID: req.params.uid },
      { profilePicture: `/uploads/${req.file.filename}` },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log("✅ Profile picture updated:", updatedUser.profilePicture);
    res.status(200).json({ message: "Profile picture updated successfully", user: updatedUser });
  } catch (error) {
    console.error("❌ Profile Picture Update Error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
