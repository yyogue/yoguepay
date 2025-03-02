const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  firebaseUID: { type: String, required: true, unique: true },
  fullName: { type: String, required: true }, // fullName
  email: { type: String, required: true, unique: true },
  phone: { type: String, unique: true, sparse: true }, 
  dateOfBirth: { type: Date, required: true }, // dateOfBirth
  country: { type: String, required: true }, //   country
  profilePicture: { type: String, default: "" }, //   profile picture
  username: { type: String, required: true, unique: true },
  kycStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" }, //  KYC status
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", UserSchema);
