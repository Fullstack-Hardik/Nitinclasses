const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is missing.');
    }

    // Explicit Mongoose options for cloud environments (Render, Atlas)
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000, // Timeout fast after 8s instead of waiting indefinitely
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10
    });

    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB Connection Error]: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
