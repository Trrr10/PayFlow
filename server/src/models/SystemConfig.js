const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'DEFAULT_CONFIG',
      unique: true,
    },
    demoDelayMs: {
      type: Number,
      default: 5000,
    },
    simulateOneFailure: {
      type: Boolean,
      default: false,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
