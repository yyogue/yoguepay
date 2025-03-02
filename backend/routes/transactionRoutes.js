const express = require("express");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const stripe = require("../config/stripe");


const router = express.Router();

// ✅ Send Money (Create a Transaction)

router.post("/send", async (req, res) => {
  console.log("💸 Send Money Request:", req.body);

  const { senderUID, receiverQuery, amount } = req.body;

  if (!senderUID || !receiverQuery || !amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid transaction details" });
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

    // **✅ Calculate 2% fee**
    const fee = amount * 0.02;
    const totalAmount = amount + fee; // Sender pays this

    // ❌ Prevent transactions if balance is too low
    if (sender.balance < totalAmount) {
      return res.status(400).json({ error: "Insufficient funds" });
    }

    // ✅ Deduct total amount from sender and add amount to receiver
    sender.balance -= totalAmount;
    receiver.balance += amount;

    // ✅ Save updated balances
    await sender.save();
    await receiver.save();

    // ✅ Create the main transaction
    const transaction = new Transaction({
      senderUID,
      receiverUID: receiver.firebaseUID,
      amount,
      status: "completed",
    });

    await transaction.save();

    // ✅ Create the fee transaction
    const feeTransaction = new Transaction({
      senderUID,
      receiverUID: "SYSTEM",
      amount: fee,
      status: "completed",
    });

    await feeTransaction.save();

    console.log("✅ Transaction Completed:", transaction);
    console.log("✅ Fee Transaction Recorded:", feeTransaction);

    res.status(200).json({
      message: "Transaction successful",
      senderBalance: sender.balance,
      receiverBalance: receiver.balance,
      transaction,
      feeTransaction,
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
    })
      .sort({ createdAt: -1 }) // Sort by newest first
      .lean(); // Convert to plain objects

    if (transactions.length === 0) {
      return res.status(404).json({ message: "No transactions found" });
    }

    res.status(200).json({ transactions });
  } catch (error) {
    console.error("❌ History Fetch Error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Add Money Route
router.post("/add-money", async (req, res) => {
  console.log("💰 Add Money Request:", req.body);

  const { uid, amount, paymentMethodId } = req.body;

  if (!uid || !amount || !paymentMethodId || amount <= 0) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    // ✅ Find user
    const user = await User.findOne({ firebaseUID: uid });
    if (!user) return res.status(404).json({ error: "User not found" });

    // ✅ Create Stripe Payment
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency: "usd",
      payment_method: paymentMethodId,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
    });

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({ error: "Payment failed" });
    }

    // ✅ Calculate 2% fee
    const fee = amount * 0.02;
    const netAmount = amount - fee; // User receives this

    // ✅ Update user balance
    user.balance += netAmount;
    await user.save();

    // ✅ Save transaction
    const transaction = new Transaction({
      senderUID: "SYSTEM",
      receiverUID: uid,
      amount: netAmount,
      status: "completed",
    });

    await transaction.save();

    // ✅ Save fee transaction
    const feeTransaction = new Transaction({
      senderUID: uid,
      receiverUID: "SYSTEM",
      amount: fee,
      status: "completed",
    });

    await feeTransaction.save();

    console.log("✅ Money Added:", transaction);
    console.log("✅ Fee Transaction Recorded:", feeTransaction);

    res.status(200).json({
      message: "Money added successfully",
      balance: user.balance,
      transaction,
      feeTransaction,
    });
  } catch (error) {
    console.error("❌ Add Money Error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});


// ✅ Withdraw Money Route
router.post("/withdraw-money", async (req, res) => {
  console.log("💳 Withdraw Money Request:", req.body);

  const { uid, amount, bankAccountId } = req.body;

  if (!uid || !amount || !bankAccountId || amount <= 0) {
    return res.status(400).json({ error: "Invalid withdrawal request" });
  }

  try {
    // ✅ Find user
    const user = await User.findOne({ firebaseUID: uid });
    if (!user) return res.status(404).json({ error: "User not found" });

    // ❌ Prevent withdrawals if balance is too low
    if (user.balance < amount) {
      return res.status(400).json({ error: "Insufficient funds" });
    }

    // ✅ Create Stripe Transfer (Withdrawal)
    const payout = await stripe.payouts.create({
      amount: amount * 100, // Convert to cents
      currency: "usd",
      destination: bankAccountId, // User’s bank account ID in Stripe
      method: "instant",
    });

    if (payout.status !== "paid") {
      return res.status(400).json({ error: "Withdrawal failed" });
    }

    // ✅ Deduct from user balance
    user.balance -= amount;
    await user.save();

    // ✅ Save transaction
    const transaction = new Transaction({
      senderUID: uid,
      receiverUID: "BANK",
      amount,
      status: "completed",
    });

    await transaction.save();

    console.log("✅ Money Withdrawn:", transaction);

    res.status(200).json({
      message: "Withdrawal successful",
      balance: user.balance,
      transaction,
    });
  } catch (error) {
    console.error("❌ Withdraw Money Error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});




module.exports = router;
