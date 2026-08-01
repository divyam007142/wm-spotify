'use strict';

/**
 * Mongoose connection factory.
 * Call connectDB() once at application startup.
 */

import mongoose from 'mongoose';

let connectionPromise;

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is required to connect to MongoDB');
  }

  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connectionPromise) return connectionPromise;

  connectionPromise = mongoose
    .connect(uri, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    })
    .then(() => {
      console.log('[startup] MongoDB connected successfully');
      return mongoose.connection;
    })
    .catch((error) => {
      connectionPromise = undefined;
      console.error('[db] MongoDB connection error:', error.message);
      throw error;
    });

  return connectionPromise;
}

export async function disconnectDB() {
  connectionPromise = undefined;
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[db] MongoDB disconnected');
  }
}
