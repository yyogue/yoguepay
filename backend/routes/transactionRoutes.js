const express = require("express");
const User = require("../models/User");
const Transaction = require("../models/Transaction");

const router = express.Router();

// ✅ Send Money (Create a Transaction)
router.post("/send", async (req, res) => {
  console.log("💸 Send Money Request:", req.body);

  const { senderUID, receiverQuery, amount } = req.body;

  if (!senderUID || !receiverQuery || !amount) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // ✅ Find sender and receiver
    const sender = await User.findOne({ firebaseUID: senderUID });
    const receiver = await User.findOne({
      $or: [{ username: receiverQuery }, { phone: receiverQuery }],
    });

    if (!sender) return res.status(404).json({ error: "Sender not found" });
    if (!receiver) return res.status(404).json({ error: "Receiver not found" });

    // ❌ Prevent self-transactions
    if (sender.firebaseUID === receiver.firebaseUID) {
      return res.status(400).json({ error: "You cannot send money to yourself" });
    }

    // ✅ Create the transaction
    const transaction = new Transaction({
      senderUID,
      receiverUID: receiver.firebaseUID,
      amount,
      status: "completed",
    });

    await transaction.save();

    console.log("✅ Transaction Completed:", transaction);

    res.status(200).json({
      message: "Transaction successful",
      transaction,
    });
  } catch (error) {
    console.error("❌ Transaction Error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});


// ✅ Get Transaction History for a User
router.get("/history/:uid", async (req, res) => {
  console.log("📜 Fetching transaction history for:", req.params.uid);

  try {
    const transactions = await Transaction.find({
      $or: [{ senderUID: req.params.uid }, { receiverUID: req.params.uid }],
    }).sort({ createdAt: -1 });

    res.status(200).json({ transactions });
  } catch (error) {
    console.error("❌ History Fetch Error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
