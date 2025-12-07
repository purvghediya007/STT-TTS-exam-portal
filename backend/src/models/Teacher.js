// src/models/Teacher.js
const mongoose = require("mongoose");
const baseUserFields = require("./baseUserFields");

const teacherSchema = new mongoose.Schema(
  {
    ...baseUserFields,
  },
  {
    collection: "Register_info_teacher",
  }
);

// Unique indexes per collection
teacherSchema.index({ email: 1 }, { unique: true });
teacherSchema.index({ username: 1 }, { unique: true });

const Teacher = mongoose.model("Teacher", teacherSchema);

module.exports = Teacher;
