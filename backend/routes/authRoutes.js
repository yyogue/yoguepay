const express = require("express");
const admin = require("../config/firebase");
const User = require("../models/User");
const upload = require("../config/multer"); // Import multer

const router = express.Router();

// Function to generate a unique username
const generateUsername = async (fullName) => {
  let baseUsername = fullName.toLowerCase().replace(/\s/g, ""); // Remove spaces
  let username = baseUsername;
  let counter = 1;

  while (await User.findOne({ username })) {
    username = `${baseUsername}${counter}`;
    counter++;
  }

  return username;
};

// Signup Route with File Upload
router.post("/signup", upload.single("profilePicture"), async (req, res) => {
  console.log("🔥 Signup request received:", req.body); // Debugging log
  console.log("📸 Uploaded file:", req.file); // Debugging log

  const { fullName, email, phone, password, dateOfBirth, country } = req.body;
  
  if (!fullName || !phone || !password || !dateOfBirth || !country) {
    return res.status(400).json({ error: "Missing required fields", received: req.body });
  }

  const profilePicture = req.file ? `/uploads/${req.file.filename}` : ""; // Store file path

  try {
    console.log("🚀 Creating user in Firebase...");
    const firebaseUser = await admin.auth().createUser({
      email,
      phoneNumber: phone,
      password,
    });

    console.log("✅ Firebase user created:", firebaseUser.uid);

    // Generate unique username
    const username = await generateUsername(fullName);

    // Save user in MongoDB
    const newUser = new User({
      firebaseUID: firebaseUser.uid,
      fullName,
      email,
      phone,
      dateOfBirth,
      country,
      profilePicture,
      username,
      kycStatus: "pending",
    });

    await newUser.save();

    console.log("✅ User stored in MongoDB:", newUser);

    res.status(201).json({
      message: "User created successfully",
      user: newUser,
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
    res.status(400).json({ error: error.message });
  }
});


module.exports = router;
