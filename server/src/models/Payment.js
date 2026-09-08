const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Payment amount must be greater than 0'],
    },
    currency: {
      type: String,
      default: 'USD',
    },
    idempotencyKey: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['CREATED', 'QUEUED', 'PROCESSING', 'SUCCESS', 'FAILED'],
      default: 'QUEUED',
    },
    attempts: {
      type: Number,
      default: 0,
    },
    failureReason: {
      type: String,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure senderId + idempotencyKey combination is unique
paymentSchema.index({ senderId: 1, idempotencyKey: 1 }, { unique: true });

module.exports = mongoose.model('Payment', paymentSchema);
