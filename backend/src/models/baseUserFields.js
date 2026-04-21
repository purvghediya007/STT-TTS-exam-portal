// src/models/baseUserFields.js
const mongoose = require("mongoose");

// You can extend this later if you need more common fields
const baseUserFields = {
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  username: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
    enum: ["teacher", "student", "admin"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // 🟢 NEW PROFILE FIELDS
  profileImage: {
    type: String,
    default: "",
  },
  bio: {
    type: String,
    trim: true,
    default: "",
  },
  phone: {
    type: String,
    trim: true,
    default: "",
  },
};

module.exports = baseUserFields;
