const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const mongoose = require('mongoose');

const getWallet = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user.userId });
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    return res.json(wallet);
  } catch (error) {
    console.error('getWallet error:', error);
    return res.status(500).json({ error: 'Failed to fetch wallet' });
  }
};

const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      $or: [{ senderId: req.user.userId }, { recipientId: req.user.userId }],
    })
      .populate('senderId', 'name email')
      .populate('recipientId', 'name email')
      .sort({ createdAt: -1 });

    return res.json(transactions);
  } catch (error) {
    console.error('getTransactions error:', error);
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

const adminWalletAdjustment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, amount, reason } = req.body;

    if (!userId || amount === undefined || isNaN(amount)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'userId and valid numeric amount are required' });
    }

    const numAmount = Number(amount);
    const targetUser = await User.findById(userId).session(session);
    if (!targetUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Target user not found' });
    }

    const wallet = await Wallet.findOne({ userId }).session(session);
    if (!wallet) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Target user wallet not found' });
    }

    if (numAmount < 0 && wallet.balance + numAmount < 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Adjustment would result in a negative balance' });
    }

    const previousBalance = wallet.balance;
    const newBalance = previousBalance + numAmount;
    wallet.balance = newBalance;
    await wallet.save({ session });

    // Create adjustment transaction record
    const ref = `ADJ-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const transaction = await Transaction.create(
      [
        {
          paymentId: new mongoose.Types.ObjectId(),
          senderId: numAmount >= 0 ? req.user.userId : userId,
          recipientId: numAmount >= 0 ? userId : req.user.userId,
          amount: Math.abs(numAmount),
          type: numAmount >= 0 ? 'CREDIT' : 'DEBIT',
          status: 'SUCCESS',
          reference: ref,
        },
      ],
      { session }
    );

    // Create audit log
    await AuditLog.create(
      [
        {
          actorId: req.user.userId,
          actorRole: req.user.role,
          action: 'WALLET_ADJUSTED',
          entityType: 'Wallet',
          entityId: wallet._id.toString(),
          metadata: {
            targetUserId: userId,
            targetUserEmail: targetUser.email,
            previousBalance,
            adjustmentAmount: numAmount,
            newBalance,
            reason: reason || 'Admin balance adjustment',
            transactionReference: ref,
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.json({
      message: 'Wallet balance adjusted successfully',
      wallet: {
        id: wallet._id,
        userId: wallet.userId,
        balance: wallet.balance,
        currency: wallet.currency,
      },
      previousBalance,
      newBalance,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('adminWalletAdjustment error:', error);
    return res.status(500).json({ error: `Admin wallet adjustment failed: ${error.message}` });
  }
};

module.exports = {
  getWallet,
  getTransactions,
  adminWalletAdjustment,
};
