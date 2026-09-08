const mongoose = require('mongoose');

const workerHeartbeatSchema = new mongoose.Schema(
  {
    workerId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    processId: {
      type: Number,
      default: process.pid,
    },
    status: {
      type: String,
      enum: ['ONLINE', 'PROCESSING', 'STOPPING', 'OFFLINE'],
      default: 'ONLINE',
      index: true,
    },
    lastHeartbeat: {
      type: Date,
      default: Date.now,
      index: true,
    },
    currentJobId: {
      type: String,
      default: null,
    },
    currentPaymentId: {
      type: String,
      default: null,
    },
    currentAttempt: {
      type: Number,
      default: 0,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    stoppedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('WorkerHeartbeat', workerHeartbeatSchema);
