/**
 * Test helper to create a test student user for debugging
 * Run: node test-helper.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("./models/user");

const createTestStudent = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✓ Connected to MongoDB");

    // Check if test student already exists
    const existingUser = await User.findOne({ email: "test.student@example.com" });
    if (existingUser) {
      console.log("✓ Test student already exists: test.student@example.com");
      console.log("  Password: TestPassword123!");
      await mongoose.connection.close();
      return;
    }

    // Create new test student
    const hashedPassword = await bcrypt.hash("TestPassword123!", 10);
    const testStudent = new User({
      firstName: "Test",
      lastName: "Student",
      email: "test.student@example.com",
      password: hashedPassword,
      userType: "student",
      isEmailVerified: true
    });

    await testStudent.save();
    console.log("✓ Test student created successfully!");
    console.log("  Email: test.student@example.com");
    console.log("  Password: TestPassword123!");

    await mongoose.connection.close();
  } catch (err) {
    console.error("✗ Error:", err.message);
    process.exit(1);
  }
};

createTestStudent();
