const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema({
  senderUID: { type: String, required: true }, // Firebase UID of sender
  receiverUID: { type: String, required: true }, // Firebase UID of receiver
  amount: { type: Number, required: true, min: 0.01 }, // Amount sent
  status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" }, // Transaction status
  createdAt: { type: Date, default: Date.now }, // Timestamp
});

module.exports = mongoose.model("Transaction", TransactionSchema);
