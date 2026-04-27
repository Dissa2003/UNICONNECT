/**
 * Run once to create the admin user:
 *   node backend/seedAdmin.js
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "src", "..", ".env") });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  const User = require("./src/models/User");

  const existing = await User.findOne({ email: "admin@uniconnect.lk" });
  if (existing) {
    console.log("Admin user already exists:", existing.email);
    process.exit(0);
  }

  const hashed = await bcrypt.hash("admin123", 10);
  await User.create({
    name: "Admin",
    email: "admin@uniconnect.lk",
    password: hashed,
    role: "admin",
    roles: ["admin"],
  });

  console.log("✓ Admin user created  email: admin@uniconnect.lk  password: admin123");
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
