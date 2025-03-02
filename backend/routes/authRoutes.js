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


router.post("/login", async (req, res) => {
  console.log("🔥 Login request received:", req.body);

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // ✅ Sign in user with Firebase Authentication
    const userRecord = await admin.auth().getUserByEmail(email);
    const firebaseToken = await admin.auth().createCustomToken(userRecord.uid);

    // ✅ Fetch user from MongoDB
    const user = await User.findOne({ firebaseUID: userRecord.uid });

    if (!user) {
      return res.status(404).json({ error: "User not found in database" });
    }

    console.log("✅ User authenticated:", user);

    res.status(200).json({
      message: "Login successful",
      token: firebaseToken,
      user,
    });
  } catch (error) {
    console.error("❌ Login Error:", error.message);
    res.status(401).json({ error: "Invalid email or password" });
  }
});



router.get("/search", async (req, res) => {
  console.log("🔍 Search request received:", req.query);

  let { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: "Search query is required" });
  }

  // ✅ Trim spaces & normalize phone format
  query = query.trim();

  // ✅ Ensure phone numbers include `+` (if missing)
  if (/^\d+$/.test(query)) {
    query = `+${query}`;
  }

  console.log("🔍 Searching for:", query);

  try {
    // ✅ Search by username OR phone number
    const user = await User.findOne({
      $or: [
        { username: query },
        { phone: query }
      ],
    });

    if (!user) {
      console.log("❌ User not found:", query);
      return res.status(404).json({ error: "User not found" });
    }

    console.log("✅ User found:", user);

    res.status(200).json({ user });
  } catch (error) {
    console.error("❌ Search Error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});




module.exports = router;
