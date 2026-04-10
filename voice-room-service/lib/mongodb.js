// lib/mongodb.js
// Singleton Mongoose connection — same pattern as reminders-service lah
// Vercel spins up a new function instance for every request, so we cache the
// connection in the global object. Otherwise we open 1000 connections then jialat!
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');

let cached = global._voiceMongoCache;
if (!cached) {
  cached = global._voiceMongoCache = { conn: null, promise: null };
}

async function connectDB() {
  // Already connected - shiok, reuse lor
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, { bufferCommands: false })
      .then((m) => {
        console.log('Voice Room Service — MongoDB connected lor');
        return m;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectDB;
