const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");

const seedUsers = [
  {
    name: "John Smith",
    email: "john@sliit.edu",
    password: "password123",
    role: "student",
    university: "SLIIT",
    degreeProgram: "IT",
    year: 2,
    profile: {
      subjects: ["DSA", "OOP", "DBMS"],
      skills: ["Java", "React", "MongoDB"],
      learningStyle: "visual"
    }
  },
  {
    name: "Sarah Johnson",
    email: "sarah@sliit.edu",
    password: "password123",
    role: "student",
    university: "SLIIT",
    degreeProgram: "IT",
    year: 2,
    profile: {
      subjects: ["DSA", "OOP", "Web Dev"],
      skills: ["Java", "React", "Node.js"],
      learningStyle: "visual"
    }
  },
  {
    name: "Michael Chen",
    email: "michael@sliit.edu",
    password: "password123",
    role: "student",
    university: "SLIIT",
    degreeProgram: "SE",
    year: 3,
    profile: {
      subjects: ["OOP", "DBMS", "Software Architecture"],
      skills: ["Java", "Spring", "MySQL"],
      learningStyle: "hands-on"
    }
  },
  {
    name: "Emma Williams",
    email: "emma@uom.edu",
    password: "password123",
    role: "student",
    university: "University of Moratuwa",
    degreeProgram: "CS",
    year: 2,
    profile: {
      subjects: ["DSA", "AI", "Machine Learning"],
      skills: ["Python", "TensorFlow", "Java"],
      learningStyle: "visual"
    }
  },
  {
    name: "David Brown",
    email: "david@sliit.edu",
    password: "password123",
    role: "student",
    university: "SLIIT",
    degreeProgram: "IT",
    year: 2,
    profile: {
      subjects: ["DSA", "Networking", "Security"],
      skills: ["Python", "Node.js", "Linux"],
      learningStyle: "reading"
    }
  },
  {
    name: "Lisa Anderson",
    email: "lisa@sliit.edu",
    password: "password123",
    role: "student",
    university: "SLIIT",
    degreeProgram: "IT",
    year: 3,
    profile: {
      subjects: ["DBMS", "Web Dev", "Cloud Computing"],
      skills: ["React", "AWS", "Docker"],
      learningStyle: "visual"
    }
  },
  {
    name: "James Wilson",
    email: "james@sliit.edu",
    password: "password123",
    role: "student",
    university: "SLIIT",
    degreeProgram: "SE",
    year: 2,
    profile: {
      subjects: ["OOP", "DSA", "Design Patterns"],
      skills: ["Java", "Python", "Git"],
      learningStyle: "hands-on"
    }
  },
  {
    name: "Sophia Martinez",
    email: "sophia@uom.edu",
    password: "password123",
    role: "student",
    university: "University of Moratuwa",
    degreeProgram: "IT",
    year: 2,
    profile: {
      subjects: ["DSA", "Mobile Dev", "UI/UX"],
      skills: ["React Native", "Flutter", "Figma"],
      learningStyle: "visual"
    }
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/uniconnect");
    console.log("Connected to MongoDB");

    // Clear existing data
    await User.deleteMany({});
    await StudentProfile.deleteMany({});
    console.log("Cleared existing users and profiles");

    // Create users and profiles
    for (const userData of seedUsers) {
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create user
      const user = await User.create({
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        university: userData.university,
        degreeProgram: userData.degreeProgram,
        year: userData.year
      });

      // Create student profile
      await StudentProfile.create({
        user: user._id,
        name: userData.name,
        email: userData.email,
        university: userData.university,
        degreeProgram: userData.degreeProgram,
        year: userData.year,
        subjects: userData.profile.subjects,
        skills: userData.profile.skills,
        learningStyle: userData.profile.learningStyle
      });

      console.log(`Created user and profile for: ${userData.name}`);
    }

    console.log("\n✅ Database seeded successfully!");
    console.log(`Total users created: ${seedUsers.length}`);
    
    // Display all profiles
    const profiles = await StudentProfile.find({}).select('_id name university degreeProgram subjects skills learningStyle');
    console.log("\n📋 Student Profiles:");
    profiles.forEach(p => {
      console.log(`\nID: ${p._id}`);
      console.log(`Name: ${p.name}`);
      console.log(`University: ${p.university}, Program: ${p.degreeProgram}`);
      console.log(`Subjects: ${p.subjects.join(', ')}`);
      console.log(`Skills: ${p.skills.join(', ')}`);
      console.log(`Learning Style: ${p.learningStyle}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seedDatabase();
