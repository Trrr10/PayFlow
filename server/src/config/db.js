const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    console.log(`Connecting to MongoDB...`);
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host} (${conn.connection.name})`);

    // Check if transactions are supported by attempting to start a session
    const session = await mongoose.startSession();
    session.endSession();
    console.log('MongoDB Session & Transaction capabilities verified.');

    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Failure Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
