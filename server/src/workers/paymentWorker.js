const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const PaymentJob = require('../models/PaymentJob');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');
const WorkerHeartbeat = require('../models/WorkerHeartbeat');
const SystemConfig = require('../models/SystemConfig');
const { claimJob, handleJobFailure, recoverStaleJobs } = require('../queue/paymentQueue');

class PaymentWorker {
  constructor(workerId) {
    this.workerId =
      workerId ||
      process.env.WORKER_ID ||
      `worker-node-${process.pid}-${Math.floor(1000 + Math.random() * 9000)}`;
    this.processId = process.pid;
    this.isRunning = false;
    this.pollIntervalMs = Number(process.env.WORKER_POLL_INTERVAL) || 1000;
    this.staleTimeoutMs = Number(process.env.JOB_LOCK_TIMEOUT) || 30000;
    this.heartbeatIntervalMs = Number(process.env.WORKER_HEARTBEAT_INTERVAL) || 2000;
    this.heartbeatTimer = null;
    this.startedAt = new Date();
  }

  async start() {
    this.isRunning = true;
    console.log(`[Worker ${this.workerId}] Process started (PID ${this.processId}). Polling interval: ${this.pollIntervalMs}ms`);
    console.log(`[Worker ${this.workerId}] Persistent Queue Engine: MongoDB Atlas`);

    // 1. Initial Heartbeat registration in MongoDB
    await this.sendHeartbeat('ONLINE');
    console.log(`[Worker ${this.workerId}] Heartbeat started (interval: ${this.heartbeatIntervalMs}ms)`);

    // 2. Periodic Heartbeat Loop
    this.heartbeatTimer = setInterval(async () => {
      if (this.isRunning) {
        await this.sendHeartbeat();
      }
    }, this.heartbeatIntervalMs);

    // 3. SIGINT and SIGTERM handlers for graceful OFFLINE shutdown
    const shutdown = async (signal) => {
      console.log(`[Worker ${this.workerId}] Received ${signal}. Updating worker record to OFFLINE and exiting...`);
      this.isRunning = false;
      if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
      try {
        await WorkerHeartbeat.findOneAndUpdate(
          { workerId: this.workerId },
          {
            $set: {
              status: 'OFFLINE',
              lastHeartbeat: new Date(),
              stoppedAt: new Date(),
              currentJobId: null,
              currentPaymentId: null,
              currentAttempt: 0,
            },
          }
        );
      } catch (err) {}
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Periodically run stale job recovery
    setInterval(async () => {
      if (this.isRunning) {
        await recoverStaleJobs(this.workerId, this.staleTimeoutMs);
      }
    }, 15000);

    this.pollLoop();
  }

  async sendHeartbeat(statusOverride = null, job = null) {
    try {
      const status =
        statusOverride || (job ? 'PROCESSING' : 'ONLINE');

      await WorkerHeartbeat.findOneAndUpdate(
        { workerId: this.workerId },
        {
          $set: {
            processId: this.processId,
            status,
            lastHeartbeat: new Date(),
            currentJobId: job ? job._id.toString() : null,
            currentPaymentId: job ? job.paymentId.toString() : null,
            currentAttempt: job ? job.attempts : 0,
            startedAt: this.startedAt,
          },
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      // Non-blocking heartbeat save
    }
  }

  async getConfig() {
    try {
      let config = await SystemConfig.findOne({ key: 'DEFAULT_CONFIG' });
      if (!config) {
        const envDelay = Number(process.env.DEMO_PROCESSING_DELAY_MS);
        config = await SystemConfig.create({
          key: 'DEFAULT_CONFIG',
          demoDelayMs: !isNaN(envDelay) ? envDelay : 5000,
          simulateOneFailure: process.env.SIMULATE_ONE_FAILURE === 'true',
        });
      }
      return config;
    } catch (err) {
      return {
        demoDelayMs: Number(process.env.DEMO_PROCESSING_DELAY_MS) || 5000,
        simulateOneFailure: process.env.SIMULATE_ONE_FAILURE === 'true',
      };
    }
  }

  async pollLoop() {
    let lastPollLog = 0;
    while (this.isRunning) {
      try {
        if (Date.now() - lastPollLog > 10000) {
          console.log(`[Worker ${this.workerId}] Polling MongoDB queue`);
          lastPollLog = Date.now();
        }

        const job = await claimJob(this.workerId);
        if (job) {
          await this.sendHeartbeat('PROCESSING', job);
          await this.processJob(job);
          await this.sendHeartbeat('ONLINE', null);
        } else {
          await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
        }
      } catch (err) {
        console.error(`[Worker ${this.workerId}] Poll error:`, err);
        await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
      }
    }
  }

  async processJob(job) {
    const config = await this.getConfig();

    console.log(`[Worker ${this.workerId}] Claimed job ${job._id}`);
    console.log(`[Worker ${this.workerId}] Processing payment ${job.paymentId}`);
    console.log(`[Worker ${this.workerId}] Attempt: ${job.attempts}`);

    // Configurable Worker Processing Delay (Internal to worker only)
    const demoDelayMs = config.demoDelayMs ?? 5000;
    if (demoDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, demoDelayMs));
    }

    // Controlled Worker Failure Simulation (Single-attempt Failure Demo)
    const isSimulatedFault = config.simulateOneFailure;
    if (isSimulatedFault && job.attempts === 1) {
      console.warn(`[Worker ${this.workerId}] Controlled failure simulation triggered on Attempt 1 before transaction commit`);

      // Reset simulateOneFailure in SystemConfig so Attempt 2 succeeds cleanly
      try {
        await SystemConfig.findOneAndUpdate(
          { key: 'DEFAULT_CONFIG' },
          { $set: { simulateOneFailure: false } }
        );
      } catch (e) {}

      await handleJobFailure(
        job,
        new Error('Controlled worker failure simulation triggered before transaction commit'),
        this.workerId
      );
      return;
    }

    // Mandatory MongoDB Session & Atomic Transaction Execution
    console.log(`[Worker ${this.workerId}] Atomic transaction started`);
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      // Read Payment within transaction
      const payment = await Payment.findById(job.paymentId).session(session);
      if (!payment) {
        throw new Error('Payment record missing');
      }

      // Idempotency check inside session transaction
      if (payment.status === 'SUCCESS') {
        await PaymentJob.findByIdAndUpdate(job._id, { $set: { status: 'SUCCESS' } }, { session });
        await session.commitTransaction();
        session.endSession();
        console.log(`[Worker ${this.workerId}] Atomic transaction committed`);
        console.log(`[Worker ${this.workerId}] Payment SUCCESS`);
        return;
      }

      // Read Sender and Recipient Wallets within transaction
      const senderWallet = await Wallet.findOne({ userId: payment.senderId }).session(session);
      const recipientWallet = await Wallet.findOne({ userId: payment.recipientId }).session(session);

      if (!senderWallet) throw new Error('Sender wallet not found');
      if (!recipientWallet) throw new Error('Recipient wallet not found');

      // Validate Sender Balance inside transaction
      if (senderWallet.balance < payment.amount) {
        await session.abortTransaction();
        session.endSession();

        await Payment.findByIdAndUpdate(payment._id, {
          $set: {
            status: 'FAILED',
            failureReason: `Insufficient wallet balance ($${senderWallet.balance.toFixed(2)})`,
          },
        });

        await PaymentJob.findByIdAndUpdate(job._id, {
          $set: { status: 'FAILED', lastError: 'Insufficient wallet balance' },
        });

        await AuditLog.create({
          actorRole: 'WORKER',
          action: 'FAILED',
          entityType: 'Payment',
          entityId: payment._id.toString(),
          metadata: {
            paymentId: payment._id.toString(),
            jobId: job._id.toString(),
            workerId: this.workerId,
            reason: 'Insufficient wallet balance',
            message: `Payment failed due to insufficient wallet balance ($${senderWallet.balance.toFixed(2)})`,
          },
        });

        console.error(`[Worker ${this.workerId}] Payment ${payment._id} FAILED: Insufficient wallet balance`);
        return;
      }

      // Execute Atomic Debit and Credit
      senderWallet.balance -= payment.amount;
      recipientWallet.balance += payment.amount;

      await senderWallet.save({ session });
      await recipientWallet.save({ session });

      // Create Atomic DEBIT and CREDIT Transaction Documents inside session
      const timestamp = Date.now();
      const debitRef = `DEB-${payment._id}-${timestamp}`;
      const creditRef = `CRE-${payment._id}-${timestamp}`;

      await Transaction.create(
        [
          {
            paymentId: payment._id,
            senderId: payment.senderId,
            recipientId: payment.recipientId,
            amount: payment.amount,
            type: 'DEBIT',
            status: 'SUCCESS',
            reference: debitRef,
          },
          {
            paymentId: payment._id,
            senderId: payment.senderId,
            recipientId: payment.recipientId,
            amount: payment.amount,
            type: 'CREDIT',
            status: 'SUCCESS',
            reference: creditRef,
          },
        ],
        { session, ordered: true }
      );

      // Update Payment and PaymentJob Status inside transaction
      payment.status = 'SUCCESS';
      payment.completedAt = new Date();
      payment.attempts = job.attempts;
      await payment.save({ session });

      await PaymentJob.findByIdAndUpdate(job._id, { $set: { status: 'SUCCESS' } }, { session });

      // Commit MongoDB Transaction
      await session.commitTransaction();
      session.endSession();

      console.log(`[Worker ${this.workerId}] Atomic transaction committed`);

      // Emit SUCCESS Audit Log
      await AuditLog.create({
        actorRole: 'WORKER',
        action: 'SUCCESS',
        entityType: 'Payment',
        entityId: payment._id.toString(),
        metadata: {
          paymentId: payment._id.toString(),
          jobId: job._id.toString(),
          workerId: this.workerId,
          attempt: job.attempts,
          amount: payment.amount,
          debitRef,
          creditRef,
          message: 'Atomic MongoDB transaction committed successfully',
        },
      });

      console.log(`[Worker ${this.workerId}] Payment SUCCESS`);
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      session.endSession();

      console.error(`[Worker ${this.workerId}] Error processing job ${job._id}:`, error.message);
      await handleJobFailure(job, error, this.workerId);
    }
  }

  stop() {
    this.isRunning = false;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    console.log(`[Worker ${this.workerId}] Worker process stopped.`);
  }
}

module.exports = PaymentWorker;
