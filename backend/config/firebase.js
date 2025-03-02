const admin = require("firebase-admin");
const dotenv = require("dotenv");

dotenv.config(); // Load environment variables

// Load Firebase service account key
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
