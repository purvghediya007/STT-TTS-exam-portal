// src/routes/authRoutes.js
const express = require("express");
const bcrypt = require("bcrypt");
const svgCaptcha = require("svg-captcha");

const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const Admin = require("../models/Admin");
const generateToken = require("../utils/generateToken");
const { createCaptcha, verifyCaptcha } = require("../utils/captchaStore");

const router = express.Router();

// Only Teacher & Student are allowed in register
const ROLE_MAP = {
  Teacher: "teacher",
  Student: "student",
};

// Get model based on normalized role
const getModelByRole = (role) => {
  switch (role) {
    case "teacher":
      return Teacher;
    case "student":
      return Student;
    case "admin":
      return Admin;
    default:
      return null;
  }
};

// Check if username/email is already used in any role (teacher, student, admin)
const findUserByUsernameOrEmail = async (username, email) => {
  const usernameLower = username.toLowerCase();
  const emailLower = email.toLowerCase();

  const [t, s, a] = await Promise.all([
    Teacher.findOne({
      $or: [
        { username: usernameLower },
        { email: emailLower },
      ],
    }),
    Student.findOne({
      $or: [
        { username: usernameLower },
        { email: emailLower },
      ],
    }),
    Admin.findOne({
      $or: [
        { username: usernameLower },
        { email: emailLower },
      ],
    }),
  ]);

  return t || s || a;
};

// ======== GET /api/auth/captcha =========
// Returns: { captchaId, svg }

router.get("/captcha", (req, res) => {
  const captcha = svgCaptcha.create({
    size: 5,
    noise: 2,
    ignoreChars: "0oO1ilI",
    background: "#f3f3f3",
  });

  const captchaId = createCaptcha(captcha.text);

  const response = {
    captchaId,
    svg: captcha.data,
  };

  // ⚠️ DEV ONLY: send plain text so you can test from Postman
  if (process.env.NODE_ENV !== "production") {
    response.captchaText = captcha.text;
  }

  return res.status(200).json(response);
});


// ======== POST /api/auth/register =========
// Body: { role: "Teacher"|"Student", email, username, password }
router.post("/register", async (req, res, next) => {
  try {
    let { role, email, username, password } = req.body;

    if (!role || !email || !username || !password) {
      return res.status(400).json({
        message: "role, email, username and password are required",
      });
    }

    // Normalize role string, e.g., "Teacher" or "teacher" -> "teacher"
    const normalizedRole =
      ROLE_MAP[role] || ROLE_MAP[role?.charAt(0).toUpperCase() + role?.slice(1)];

    if (!normalizedRole) {
      return res.status(400).json({
        message: "Invalid role. Allowed: Teacher, Student",
      });
    }

    // Extra safety: block any admin registration via this endpoint
    if (normalizedRole === "admin") {
      return res.status(403).json({
        message: "Admin accounts cannot be created via this API",
      });
    }
  
    // Check if user exists (across all collections)
    const existing = await findUserByUsernameOrEmail(username, email);
    if (existing) {
      return res
        .status(409)
        .json({ message: "Username or email already registered" });
    }

    const Model = getModelByRole(normalizedRole);
    if (!Model) {
      return res.status(500).json({ message: "Internal role mapping error" });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const userDoc = await Model.create({
      email,
      username,
      passwordHash,
      role: normalizedRole,
    });

    return res.status(201).json({
      message: "Registration successful",
      user: {
        id: userDoc._id,
        email: userDoc.email,
        username: userDoc.username,
        role: userDoc.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ======== POST /api/auth/login =========
// Body: { username, password, captchaId, captchaValue }
router.post("/login", async (req, res, next) => {
  try {
    const { username, password, captchaId, captchaValue } = req.body;

    if (!username || !password || !captchaId || !captchaValue) {
      return res.status(400).json({
        message: "username, password, captchaId and captchaValue are required",
      });
    }

    // Verify captcha
    const captchaOk = verifyCaptcha(captchaId, captchaValue);
    if (!captchaOk) {
      return res.status(400).json({
        message: "Invalid or expired captcha",
      });
    }

    const usernameLower = username.toLowerCase();

    // Find user by username across all roles
    const [teacher, student, admin] = await Promise.all([
      Teacher.findOne({ username: usernameLower }),
      Student.findOne({ username: usernameLower }),
      Admin.findOne({ username: usernameLower }),
    ]);

    const userDoc = teacher || student || admin;

    if (!userDoc) {
      return res.status(401).json({ message: "Invalid username" });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      userDoc.passwordHash
    );

    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = generateToken(userDoc._id, userDoc.role);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: userDoc._id,
        email: userDoc.email,
        username: userDoc.username,
        role: userDoc.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
