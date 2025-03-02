const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");

dotenv.config();
connectDB();

const app = express();

// ✅ Add these middleware to parse form data correctly
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // This is important!
app.use("/api/users", userRoutes);

app.use("/api/auth", authRoutes);

// Test Route
app.get("/", (req, res) => {
  res.send("YoguePay Backend is Running!");
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
