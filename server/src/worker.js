require('dotenv').config();
const connectDB = require('./config/db');
const PaymentWorker = require('./workers/paymentWorker');

const runWorker = async () => {
  console.log('Starting PayFlow Payment Worker Process...');

  // Connect to MongoDB Atlas (Mandatory)
  await connectDB();

  const workerId = `worker-node-${process.pid}-${Math.random().toString(36).substring(2, 6)}`;
  const worker = new PaymentWorker(workerId);

  // NOTE: SIGINT and SIGTERM are handled inside PaymentWorker.start()
  // Do not add duplicate handlers here — the worker handles graceful
  // OFFLINE heartbeat update to MongoDB before exiting.

  worker.start();
};

runWorker();
