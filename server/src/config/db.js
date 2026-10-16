const mongoose = require('mongoose');

const sanitizeUri = (rawUri) => {
  if (!rawUri) return '';
  let uri = rawUri.trim();
  // Strip surrounding quotes
  uri = uri.replace(/^["']+|["']+$/g, '').trim();
  // If user accidentally pasted `MONGODB_URI=...` or `MONGODB_URI="mongodb+srv..."` into the dashboard value
  const match = uri.match(/mongodb(?:\+srv)?:\/\/[^\s"']+/i);
  if (match) {
    return match[0];
  }
  return uri;
};

const connectDB = async () => {
  try {
    const rawUri = process.env.MONGODB_URI;
    if (!rawUri) {
      throw new Error('MONGODB_URI environment variable is missing.');
    }

    const uri = sanitizeUri(rawUri);

    // Explicit Mongoose options for cloud environments (Render, Atlas)
    const conn = await mongoose.connect(uri, {
      dbName: 'nitin_sir_classes',
      serverSelectionTimeoutMS: 8000, // Timeout fast after 8s instead of waiting indefinitely
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10
    });

    console.log(`[MongoDB] Connected successfully: ${conn.connection.host} (DB: ${conn.connection.name})`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB Connection Error]: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
