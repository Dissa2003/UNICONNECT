const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
const StudentProfile = require('./src/models/StudentProfile');
require('dotenv').config();

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/uniconnect';

async function main(){
  await mongoose.connect(MONGO);
  console.log('connected to db');
  const subjects = ['Math','Physics','Chemistry','Biology','Computer Science'];

  for(let i=1;i<=5;i++){
    const email = `test${i}@example.com`;
    let user = await User.findOne({email});
    if(!user){
      user = await User.create({
        name: `Test User ${i}`,
        email,
        password: await bcrypt.hash('password',10),
        role:'student'
      });
      console.log('created user',user.email);
    }
    // create or update profile
    let profile = await StudentProfile.findOne({user:user._id});
    const chosen = subjects.slice(0,3).map((s,j)=>subjects[(i+j)%subjects.length]);
    if(!profile){
      profile = await StudentProfile.create({
        user: user._id,
        name: user.name,
        subjects: chosen,
        strongSubjects: [chosen[0]],
        weakSubjects: [chosen[2]]
      });
      console.log('created profile',user.email);
    } else {
      profile.subjects = chosen;
      profile.strongSubjects = [chosen[0]];
      profile.weakSubjects = [chosen[2]];
      await profile.save();
      console.log('updated profile',user.email);
    }
  }

  mongoose.disconnect();
  console.log('done');
}

main().catch(e=>{console.error(e);process.exit(1);});