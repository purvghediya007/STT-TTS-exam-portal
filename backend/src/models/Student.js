// src/models/Student.js
const mongoose = require("mongoose");
const baseUserFields = require("./baseUserFields");

const studentSchema = new mongoose.Schema(
  {
    ...baseUserFields,
    enrollmentNumber: {
      type: String,
      sparse: true,
      trim: true,
    },

    // 🟢 NEW FIELDS (SAFE ADDITION)
    branch: {
      type: String,
      trim: true,
      default: "", // empty means not assigned yet
    },

    semester: {
      type: Number,
      default: null, // null = not assigned yet
    },

    // 🟢 PROFILE FIELDS
    address: {
      type: String,
      trim: true,
      default: "",
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },

  },
  {
    collection: "Register_info_student",
  }
);

studentSchema.index({ email: 1 }, { unique: true });
studentSchema.index({ username: 1 }, { unique: true });

const Student = mongoose.model("Student", studentSchema);

module.exports = Student;
