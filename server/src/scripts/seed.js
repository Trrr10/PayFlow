require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Payment = require('../models/Payment');
const PaymentJob = require('../models/PaymentJob');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');

const seed = async () => {
  try {
    console.log('Connecting to database for seeding...');
    await connectDB();

    console.log('Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Wallet.deleteMany({}),
      Payment.deleteMany({}),
      PaymentJob.deleteMany({}),
      Transaction.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);

    console.log('Creating admin and demo users...');
    const salt = await bcrypt.genSalt(10);
    const adminPasswordHash = await bcrypt.hash('Admin@123', salt);
    const userPasswordHash = await bcrypt.hash('User@123', salt);

    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@payflow.com',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
    });

    const alice = await User.create({
      name: 'Alice Smith',
      email: 'alice@payflow.com',
      passwordHash: userPasswordHash,
      role: 'USER',
    });

    const bob = await User.create({
      name: 'Bob Johnson',
      email: 'bob@payflow.com',
      passwordHash: userPasswordHash,
      role: 'USER',
    });

    console.log('Creating initial wallets...');
    const adminWallet = await Wallet.create({ userId: admin._id, balance: 10000, currency: 'USD' });
    const aliceWallet = await Wallet.create({ userId: alice._id, balance: 0, currency: 'USD' });
    const bobWallet = await Wallet.create({ userId: bob._id, balance: 0, currency: 'USD' });

    console.log('Performing initial logged admin wallet adjustment for Alice ($1,000)...');
    aliceWallet.balance = 1000;
    await aliceWallet.save();

    const ref = `SEED-ADJ-${Date.now()}`;
    await Transaction.create({
      paymentId: new mongoose.Types.ObjectId(),
      senderId: admin._id,
      recipientId: alice._id,
      amount: 1000,
      type: 'CREDIT',
      status: 'SUCCESS',
      reference: ref,
    });

    await AuditLog.create([
      {
        actorId: admin._id,
        actorRole: 'ADMIN',
        action: 'USER_REGISTERED',
        entityType: 'User',
        entityId: admin._id.toString(),
        metadata: { note: 'Seed Admin User' },
      },
      {
        actorId: admin._id,
        actorRole: 'ADMIN',
        action: 'WALLET_ADJUSTED',
        entityType: 'Wallet',
        entityId: aliceWallet._id.toString(),
        metadata: {
          targetUserId: alice._id.toString(),
          targetUserEmail: alice.email,
          previousBalance: 0,
          adjustmentAmount: 1000,
          newBalance: 1000,
          reason: 'Initial demo funding for Alice',
          transactionReference: ref,
        },
      },
    ]);

    console.log('==================================================');
    console.log('✅ DATABASE SEEDED SUCCESSFULLY!');
    console.log('   Admin: admin@payflow.com / Admin@123');
    console.log('   Alice: alice@payflow.com / User@123 (Balance: $1,000)');
    console.log('   Bob:   bob@payflow.com   / User@123 (Balance: $0)');
    console.log('==================================================');

    process.exit(0);
  } catch (error) {
    console.error('Seed script error:', error);
    process.exit(1);
  }
};

seed();
