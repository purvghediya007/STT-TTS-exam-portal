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
  },
  {
    collection: "Register_info_student",
  }
);

studentSchema.index({ email: 1 }, { unique: true });
studentSchema.index({ username: 1 }, { unique: true });

const Student = mongoose.model("Student", studentSchema);

module.exports = Student;
