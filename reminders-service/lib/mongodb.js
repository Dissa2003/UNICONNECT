// lib/mongodb.js
// Singleton Mongoose connection lah - Vercel spin up new function instance every time,
// so we cache the connection inside global object. Otherwise open 100 connections then jialat.
require('dotenv').config();

const mongoose = require('mongoose');

// Store cached connection in global scope so it survives across hot reloads
let cached = global._mongooseCache;

if (!cached) {
  // First time running - init the cache lor
  cached = global._mongooseCache = { conn: null, promise: null };
}

async function connectDB() {
  // Wah, already connected - just return lor, no need open again
  if (cached.conn) return cached.conn;

  // If no promise yet, create the connection promise lah
  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Don't queue commands if disconnected - fail fast can
    };

    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, opts)
      .then((mongooseInstance) => {
        console.log('MongoDB Atlas connected lor - steady!');
        return mongooseInstance;
      });
  }

  // Wait for connection then cache it - next time shiok, reuse same one
  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectDB;
