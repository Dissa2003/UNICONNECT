const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  roles: [String],
  tokenVersion: Number,
  faceAuth: {
    enabled: Boolean,
    descriptor: [Number],
    descriptorLength: Number,
    updatedAt: Date
  },
  university: String,
  degreeProgram: String,
  year: Number
});
const User = mongoose.model('User', UserSchema);

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to', process.env.MONGO_URI);

  const targets = await User.find({
    'faceAuth.enabled': true,
    'faceAuth.descriptorLength': { $gt: 0 },
    roles: 'student'
  }).select('name email roles faceAuth.descriptorLength');

  if (targets.length === 0) {
    console.log('No matching users found (student + face ID enrolled).');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${targets.length} student user(s) with face ID enrolled:`);
  targets.forEach(u =>
    console.log(`  - ${u.email} | ${u.name} | roles: [${u.roles.join(', ')}]`)
  );

  const ids = targets.map(u => u._id);
  const result = await User.deleteMany({ _id: { $in: ids } });
  console.log(`Deleted: ${result.deletedCount} user(s).`);
  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
