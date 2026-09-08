const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    actorRole: {
      type: String,
      default: 'SYSTEM',
    },
    action: {
      type: String,
      required: true,
      enum: [
        'USER_REGISTERED',
        'USER_LOGIN',
        'WALLET_CREATED',
        'PAYMENT_CREATED',
        'PAYMENT_QUEUED',
        'PAYMENT_PROCESSING',
        'PAYMENT_RETRY',
        'PAYMENT_SUCCESS',
        'PAYMENT_FAILED',
        'WALLET_ADJUSTED',
        'WORKER_FAILURE',
        'WORKER_RECOVERY',
      ],
    },
    entityType: {
      type: String,
      required: true,
    },
    entityId: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
