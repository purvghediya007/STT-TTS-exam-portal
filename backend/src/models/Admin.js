// src/models/Admin.js
const mongoose = require("mongoose");
const baseUserFields = require("./baseUserFields");

const adminSchema = new mongoose.Schema(
  {
    ...baseUserFields,
  },
  {
    collection: "Register_info_admin",
  }
);

adminSchema.index({ email: 1 }, { unique: true });
adminSchema.index({ username: 1 }, { unique: true });

const Admin = mongoose.model("Admin", adminSchema);

module.exports = Admin;
