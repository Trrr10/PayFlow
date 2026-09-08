require('dotenv').config();
const connectDB = require('../config/db');

async function test() {
  console.log('Testing MongoDB connection...');
  await connectDB();
  console.log('Connection test completed successfully.');
  process.exit(0);
}

test();
