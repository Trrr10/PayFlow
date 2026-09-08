const mongoose = require('mongoose');

const paymentJobSchema = new mongoose.Schema(
  {
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
    },
    status: {
      type: String,
      enum: ['QUEUED', 'PROCESSING', 'SUCCESS', 'FAILED'],
      default: 'QUEUED',
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    availableAt: {
      type: Date,
      default: Date.now,
    },
    lockedAt: {
      type: Date,
      default: null,
    },
    lockedBy: {
      type: String,
      default: null,
    },
    lastError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

paymentJobSchema.index({ status: 1, availableAt: 1, createdAt: 1 });
paymentJobSchema.index({ paymentId: 1 });

module.exports = mongoose.model('PaymentJob', paymentJobSchema);
