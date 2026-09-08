const PaymentJob = require('../models/PaymentJob');
const Payment = require('../models/Payment');
const AuditLog = require('../models/AuditLog');

const claimJob = async (workerId) => {
  try {
    const job = await PaymentJob.findOneAndUpdate(
      {
        status: 'QUEUED',
        availableAt: { $lte: new Date() },
      },
      {
        $set: {
          status: 'PROCESSING',
          lockedAt: new Date(),
          lockedBy: workerId,
        },
        $inc: {
          attempts: 1,
        },
      },
      {
        sort: { createdAt: 1 },
        new: true,
      }
    );

    if (job) {
      // 1. Audit Log: WORKER_CLAIMED
      await AuditLog.create({
        actorRole: 'WORKER',
        action: 'WORKER_CLAIMED',
        entityType: 'PaymentJob',
        entityId: job._id.toString(),
        metadata: {
          paymentId: job.paymentId.toString(),
          jobId: job._id.toString(),
          workerId,
          attempt: job.attempts,
          message: `Worker ${workerId} atomically claimed job ${job._id}`,
        },
      });

      // 2. Audit Log: PROCESSING & Update Payment status to PROCESSING
      await Payment.findByIdAndUpdate(job.paymentId, {
        $set: {
          status: 'PROCESSING',
          attempts: job.attempts,
        },
      });

      await AuditLog.create({
        actorRole: 'WORKER',
        action: 'PROCESSING',
        entityType: 'Payment',
        entityId: job.paymentId.toString(),
        metadata: {
          paymentId: job.paymentId.toString(),
          jobId: job._id.toString(),
          workerId,
          attempt: job.attempts,
          message: `Worker is processing payment transaction (Attempt #${job.attempts})`,
        },
      });

      console.log(`[Worker ${workerId}] Claimed job ${job._id} for Payment ${job.paymentId} (Attempt #${job.attempts})`);
      console.log(`[Worker ${workerId}] Payment ${job.paymentId} PROCESSING`);
    }

    return job;
  } catch (error) {
    console.error(`[Worker ${workerId}] Claim job error:`, error);
    return null;
  }
};

const handleJobFailure = async (job, error, workerId) => {
  try {
    const attempts = job.attempts;
    const maxAttempts = job.maxAttempts || 3;
    const errorMessage = error.message || 'Unknown processing error';

    // 1. Audit Log: WORKER_FAILURE
    await AuditLog.create({
      actorRole: 'WORKER',
      action: 'WORKER_FAILURE',
      entityType: 'PaymentJob',
      entityId: job._id.toString(),
      metadata: {
        paymentId: job.paymentId.toString(),
        jobId: job._id.toString(),
        workerId,
        attempt: attempts,
        error: errorMessage,
        message: `Worker encountered failure on attempt ${attempts}: ${errorMessage}`,
      },
    });

    console.error(
      `[Worker ${workerId}] ⚠️ WORKER_FAILURE on job ${job._id} (Payment ${job.paymentId}), attempt ${attempts}: ${errorMessage}`
    );

    if (attempts < maxAttempts) {
      // Exponential backoff: 2s for attempt 1, 4s for attempt 2, etc.
      const delayMs = Math.pow(2, attempts) * 1000;
      const nextAvailableAt = new Date(Date.now() + delayMs);

      await PaymentJob.findByIdAndUpdate(job._id, {
        $set: {
          status: 'QUEUED',
          availableAt: nextAvailableAt,
          lockedAt: null,
          lockedBy: null,
          lastError: errorMessage,
        },
      });

      await Payment.findByIdAndUpdate(job.paymentId, {
        $set: {
          status: 'QUEUED',
          attempts: attempts,
          failureReason: `Attempt ${attempts} failed: ${errorMessage}. Retrying in ${delayMs / 1000}s`,
        },
      });

      // 2. Audit Log: RETRY_SCHEDULED
      await AuditLog.create({
        actorRole: 'WORKER',
        action: 'RETRY_SCHEDULED',
        entityType: 'PaymentJob',
        entityId: job._id.toString(),
        metadata: {
          paymentId: job.paymentId.toString(),
          jobId: job._id.toString(),
          workerId,
          attempt: attempts,
          maxAttempts,
          nextAvailableAt,
          error: errorMessage,
          message: `Job scheduled for retry #${attempts + 1} at ${nextAvailableAt.toLocaleTimeString()}`,
        },
      });

      console.log(
        `[Worker ${workerId}] RETRY_SCHEDULED for job ${job._id} (Payment ${job.paymentId}). Next run at ${nextAvailableAt.toLocaleTimeString()}`
      );
    } else {
      // Exhausted all attempts -> mark as FAILED permanently
      await PaymentJob.findByIdAndUpdate(job._id, {
        $set: {
          status: 'FAILED',
          lockedAt: null,
          lockedBy: null,
          lastError: errorMessage,
        },
      });

      await Payment.findByIdAndUpdate(job.paymentId, {
        $set: {
          status: 'FAILED',
          attempts: attempts,
          failureReason: `Exhausted ${maxAttempts} retry attempts. Last error: ${errorMessage}`,
        },
      });

      // Audit Log: FAILED
      await AuditLog.create({
        actorRole: 'WORKER',
        action: 'FAILED',
        entityType: 'Payment',
        entityId: job.paymentId.toString(),
        metadata: {
          paymentId: job.paymentId.toString(),
          jobId: job._id.toString(),
          workerId,
          attempts,
          maxAttempts,
          failureReason: errorMessage,
          message: `Payment permanently FAILED after ${attempts} attempts`,
        },
      });

      console.error(
        `[Worker ${workerId}] Job ${job._id} (Payment ${job.paymentId}) PERMANENTLY FAILED after ${attempts} attempts.`
      );
    }
  } catch (err) {
    console.error(`[Worker ${workerId}] Error inside handleJobFailure:`, err);
  }
};

const recoverStaleJobs = async (workerId, timeoutMs = 30000) => {
  try {
    const cutoff = new Date(Date.now() - timeoutMs);
    const staleJobs = await PaymentJob.find({
      status: 'PROCESSING',
      lockedAt: { $lt: cutoff },
    });

    if (staleJobs.length === 0) return 0;

    for (const job of staleJobs) {
      const abandonedWorker = job.lockedBy;

      await PaymentJob.findByIdAndUpdate(job._id, {
        $set: {
          status: 'QUEUED',
          lockedAt: null,
          lockedBy: null,
          availableAt: new Date(),
          lastError: `Recovered from crashed/stale worker ${abandonedWorker}`,
        },
      });

      await Payment.findByIdAndUpdate(job.paymentId, {
        $set: {
          status: 'QUEUED',
        },
      });

      await AuditLog.create({
        actorRole: 'WORKER',
        action: 'WORKER_RECOVERY',
        entityType: 'PaymentJob',
        entityId: job._id.toString(),
        metadata: {
          paymentId: job.paymentId.toString(),
          jobId: job._id.toString(),
          recoveredByWorker: workerId,
          abandonedWorker,
          lockedAt: job.lockedAt,
          message: `Stale job recovered from abandoned worker ${abandonedWorker}`,
        },
      });

      console.log(
        `[Worker ${workerId}] Recovered stale job ${job._id} previously locked by worker ${abandonedWorker}`
      );
    }

    return staleJobs.length;
  } catch (error) {
    console.error(`[Worker ${workerId}] Error recovering stale jobs:`, error);
    return 0;
  }
};

module.exports = {
  claimJob,
  handleJobFailure,
  recoverStaleJobs,
};
