const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Payment = require('../models/Payment');
const PaymentJob = require('../models/PaymentJob');
const AuditLog = require('../models/AuditLog');
const SystemConfig = require('../models/SystemConfig');
const WorkerHeartbeat = require('../models/WorkerHeartbeat');

let faultSimulationActive = process.env.SIMULATE_WORKER_FAILURE === 'true';

const getStats = async (req, res) => {
  try {
    const timeoutMs = Number(process.env.WORKER_HEARTBEAT_TIMEOUT) || 6000;
    const cutoff = new Date(Date.now() - timeoutMs);

    const [
      totalUsers,
      totalWallets,
      totalPayments,
      successfulPayments,
      failedPayments,
      queuedJobs,
      processingJobs,
      retryingJobs,
      systemConfig,
      allWorkers,
    ] = await Promise.all([
      User.countDocuments(),
      Wallet.countDocuments(),
      Payment.countDocuments(),
      Payment.countDocuments({ status: 'SUCCESS' }),
      Payment.countDocuments({ status: 'FAILED' }),
      PaymentJob.countDocuments({ status: 'QUEUED', attempts: 0 }),
      PaymentJob.countDocuments({ status: 'PROCESSING' }),
      PaymentJob.countDocuments({ status: 'QUEUED', attempts: { $gt: 0 } }),
      SystemConfig.findOne({ key: 'DEFAULT_CONFIG' }),
      WorkerHeartbeat.find().sort({ lastHeartbeat: -1 }),
    ]);

    const onlineWorkers = allWorkers.filter(
      (w) => w.status !== 'OFFLINE' && new Date(w.lastHeartbeat) >= cutoff
    );

    return res.json({
      totalUsers,
      totalWallets,
      totalPayments,
      successfulPayments,
      failedPayments,
      queuedJobs,
      processingJobs,
      retryingJobs,
      faultSimulationActive: systemConfig ? systemConfig.simulateOneFailure : faultSimulationActive,
      demoDelayMs: systemConfig ? systemConfig.demoDelayMs : 5000,
      registeredWorkerCount: allWorkers.length,
      onlineWorkerCount: onlineWorkers.length,
      staleWorkerCount: allWorkers.length - onlineWorkers.length,
      workers: allWorkers.map((w) => ({
        workerId: w.workerId,
        processId: w.processId,
        status: new Date(w.lastHeartbeat) < cutoff ? 'OFFLINE' : w.status,
        lastHeartbeat: w.lastHeartbeat,
        currentJobId: w.currentJobId,
        currentPaymentId: w.currentPaymentId,
        currentAttempt: w.currentAttempt,
        startedAt: w.startedAt,
        stoppedAt: w.stoppedAt,
        uptimeMs: Date.now() - new Date(w.startedAt).getTime(),
      })),
    });
  } catch (error) {
    console.error('getStats error:', error);
    return res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    const wallets = await Wallet.find();

    const walletMap = {};
    wallets.forEach((w) => {
      walletMap[w.userId.toString()] = w;
    });

    const userList = users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      wallet: walletMap[u._id.toString()]
        ? {
            id: walletMap[u._id.toString()]._id,
            balance: walletMap[u._id.toString()].balance,
            currency: walletMap[u._id.toString()].currency,
          }
        : null,
    }));

    return res.json(userList);
  } catch (error) {
    console.error('getUsers error:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
};

const getAdminPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('senderId', 'name email')
      .populate('recipientId', 'name email')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json(payments);
  } catch (error) {
    console.error('getAdminPayments error:', error);
    return res.status(500).json({ error: 'Failed to fetch admin payments' });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const { action, limit = 50 } = req.query;
    const query = {};
    if (action) query.action = action;

    const logs = await AuditLog.find(query)
      .populate('actorId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    return res.json(logs);
  } catch (error) {
    console.error('getAuditLogs error:', error);
    return res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

const getQueueHealth = async (req, res) => {
  try {
    const timeoutMs = Number(process.env.WORKER_HEARTBEAT_TIMEOUT) || 6000;
    const cutoff = new Date(Date.now() - timeoutMs);

    const [
      queuedCount,
      processingCount,
      retryingCount,
      successCount,
      failedCount,
      oldestJob,
      allWorkers,
    ] = await Promise.all([
      PaymentJob.countDocuments({ status: 'QUEUED', attempts: 0 }),
      PaymentJob.countDocuments({ status: 'PROCESSING' }),
      PaymentJob.countDocuments({ status: 'QUEUED', attempts: { $gt: 0 } }),
      PaymentJob.countDocuments({ status: 'SUCCESS' }),
      PaymentJob.countDocuments({ status: 'FAILED' }),
      PaymentJob.findOne({ status: 'QUEUED' }).sort({ createdAt: 1 }),
      WorkerHeartbeat.find().sort({ lastHeartbeat: -1 }),
    ]);

    const onlineWorkers = allWorkers.filter(
      (w) => w.status !== 'OFFLINE' && new Date(w.lastHeartbeat) >= cutoff
    );

    return res.json({
      queuedCount,
      processingCount,
      retryingCount,
      successCount,
      failedCount,
      totalJobs: queuedCount + processingCount + retryingCount + successCount + failedCount,
      oldestQueuedJobAgeMs: oldestJob ? Date.now() - new Date(oldestJob.createdAt).getTime() : 0,
      registeredWorkerCount: allWorkers.length,
      onlineWorkerCount: onlineWorkers.length,
      staleWorkerCount: allWorkers.length - onlineWorkers.length,
      activeWorkers: onlineWorkers.map((w) => ({
        workerId: w.workerId,
        processId: w.processId,
        status: w.status,
        lastHeartbeat: w.lastHeartbeat,
      })),
    });
  } catch (error) {
    console.error('getQueueHealth error:', error);
    return res.status(500).json({ error: 'Failed to fetch queue health' });
  }
};

const getWorkersStatus = async (req, res) => {
  try {
    const timeoutMs = Number(process.env.WORKER_HEARTBEAT_TIMEOUT) || 6000;
    const cutoff = new Date(Date.now() - timeoutMs);

    const allWorkers = await WorkerHeartbeat.find().sort({ lastHeartbeat: -1 });

    if (allWorkers.length === 0) {
      return res.json({
        message: 'No worker registered',
        isWorkerOnline: false,
        registeredWorkerCount: 0,
        onlineWorkerCount: 0,
        workers: [],
      });
    }

    const onlineWorkers = allWorkers.filter(
      (w) => w.status !== 'OFFLINE' && new Date(w.lastHeartbeat) >= cutoff
    );

    const workersWithStale = allWorkers.map((w) => {
      const isStale = w.status === 'OFFLINE' || new Date(w.lastHeartbeat) < cutoff;
      return {
        workerId: w.workerId,
        processId: w.processId,
        status: isStale ? 'OFFLINE' : w.status,
        lastHeartbeat: w.lastHeartbeat,
        currentJobId: w.currentJobId,
        currentPaymentId: w.currentPaymentId,
        currentAttempt: w.currentAttempt,
        startedAt: w.startedAt,
        stoppedAt: w.stoppedAt,
        uptimeMs: Date.now() - new Date(w.startedAt).getTime(),
        isStale,
      };
    });

    const activeProcessingJobs = await PaymentJob.find({ status: 'PROCESSING' })
      .populate('paymentId')
      .sort({ lockedAt: -1 });

    const recentWorkerLogs = await AuditLog.find({
      action: { $in: ['WORKER_CLAIMED', 'PROCESSING', 'WORKER_FAILURE', 'RETRY_SCHEDULED', 'SUCCESS', 'FAILED'] },
    })
      .sort({ createdAt: -1 })
      .limit(20);

    const config = await SystemConfig.findOne({ key: 'DEFAULT_CONFIG' });

    return res.json({
      message: onlineWorkers.length > 0 ? 'Worker Online' : 'Worker Offline',
      isWorkerOnline: onlineWorkers.length > 0,
      registeredWorkerCount: allWorkers.length,
      onlineWorkerCount: onlineWorkers.length,
      staleWorkerCount: allWorkers.length - onlineWorkers.length,
      workers: workersWithStale,
      demoDelayMs: config ? config.demoDelayMs : 5000,
      simulateOneFailure: config ? config.simulateOneFailure : false,
      activeProcessingJobs,
      recentWorkerActivity: recentWorkerLogs,
    });
  } catch (error) {
    console.error('getWorkersStatus error:', error);
    return res.status(500).json({ error: 'Failed to fetch workers status' });
  }
};

const getSystemConfig = async (req, res) => {
  try {
    let config = await SystemConfig.findOne({ key: 'DEFAULT_CONFIG' });
    if (!config) {
      config = await SystemConfig.create({
        key: 'DEFAULT_CONFIG',
        demoDelayMs: 5000,
        simulateOneFailure: false,
      });
    }

    const timeoutMs = Number(process.env.WORKER_HEARTBEAT_TIMEOUT) || 6000;
    const cutoff = new Date(Date.now() - timeoutMs);
    const allWorkers = await WorkerHeartbeat.find().sort({ lastHeartbeat: -1 });
    const onlineWorkers = allWorkers.filter(
      (w) => w.status !== 'OFFLINE' && new Date(w.lastHeartbeat) >= cutoff
    );

    return res.json({
      demoDelayMs: config.demoDelayMs,
      simulateOneFailure: config.simulateOneFailure,
      isWorkerOnline: onlineWorkers.length > 0,
      registeredWorkerCount: allWorkers.length,
      onlineWorkerCount: onlineWorkers.length,
      workers: allWorkers.map((w) => ({
        workerId: w.workerId,
        processId: w.processId,
        status: new Date(w.lastHeartbeat) < cutoff ? 'OFFLINE' : w.status,
        lastHeartbeat: w.lastHeartbeat,
      })),
    });
  } catch (error) {
    console.error('getSystemConfig error:', error);
    return res.status(500).json({ error: 'Failed to fetch system config' });
  }
};

const updateSystemConfig = async (req, res) => {
  try {
    const { demoDelayMs, simulateOneFailure } = req.body;
    const updateData = {};
    if (demoDelayMs !== undefined) updateData.demoDelayMs = Number(demoDelayMs);
    if (simulateOneFailure !== undefined) updateData.simulateOneFailure = Boolean(simulateOneFailure);

    const config = await SystemConfig.findOneAndUpdate(
      { key: 'DEFAULT_CONFIG' },
      { $set: updateData },
      { upsert: true, new: true }
    );

    if (simulateOneFailure !== undefined) {
      process.env.SIMULATE_WORKER_FAILURE = simulateOneFailure ? 'true' : 'false';
    }
    if (demoDelayMs !== undefined) {
      process.env.DEMO_PROCESSING_DELAY_MS = String(demoDelayMs);
    }

    await AuditLog.create({
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: 'SYSTEM_CONFIG_UPDATE',
      entityType: 'SystemConfig',
      metadata: {
        updatedBy: req.user.email,
        demoDelayMs: config.demoDelayMs,
        simulateOneFailure: config.simulateOneFailure,
      },
    });

    return res.json({
      message: 'System configuration updated successfully',
      config,
    });
  } catch (error) {
    console.error('updateSystemConfig error:', error);
    return res.status(500).json({ error: 'Failed to update system config' });
  }
};

const toggleFaultSimulation = async (req, res) => {
  try {
    const { enabled } = req.body;
    const targetState = enabled !== undefined ? Boolean(enabled) : !faultSimulationActive;

    const config = await SystemConfig.findOneAndUpdate(
      { key: 'DEFAULT_CONFIG' },
      { $set: { simulateOneFailure: targetState } },
      { upsert: true, new: true }
    );

    faultSimulationActive = targetState;
    process.env.SIMULATE_WORKER_FAILURE = targetState ? 'true' : 'false';

    return res.json({
      message: `Worker fault simulation ${targetState ? 'ENABLED' : 'DISABLED'}`,
      simulateOneFailure: config.simulateOneFailure,
    });
  } catch (error) {
    console.error('toggleFaultSimulation error:', error);
    return res.status(500).json({ error: 'Failed to toggle fault simulation' });
  }
};

const getFaultSimulationState = () => faultSimulationActive;

module.exports = {
  getStats,
  getUsers,
  getAdminPayments,
  getAuditLogs,
  getQueueHealth,
  getWorkersStatus,
  getSystemConfig,
  updateSystemConfig,
  toggleFaultSimulation,
  getFaultSimulationState,
};
