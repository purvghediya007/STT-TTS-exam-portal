// src/routes/authRoutes.js
const express = require("express");
const bcrypt = require("bcrypt");
const svgCaptcha = require("svg-captcha");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const ResetToken = require("../models/ResetToken");

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
      $or: [{ username: usernameLower }, { email: emailLower }],
    }),
    Student.findOne({
      $or: [{ username: usernameLower }, { email: emailLower }],
    }),
    Admin.findOne({
      $or: [{ username: usernameLower }, { email: emailLower }],
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
// Body: { role: "Teacher"|"Student", email, username, password, enrollmentNumber (optional for students) }
router.post("/register", async (req, res, next) => {
  try {
    let { role, email, username, password, enrollmentNumber } = req.body;
    console.log(
      `Registration attempt: role=${role}, email=${email}, username=${username}`
    );

    if (!role || !email || !username || !password) {
      return res.status(400).json({
        message: "role, email, username and password are required",
      });
    }

    // Normalize role string, e.g., "Teacher" or "teacher" -> "teacher"
    const normalizedRole =
      ROLE_MAP[role] ||
      ROLE_MAP[role?.charAt(0).toUpperCase() + role?.slice(1)];

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

    // Build user document based on role
    const userDocData = {
      email,
      username,
      passwordHash,
      role: normalizedRole,
    };

    // Add enrollmentNumber for students if provided
    if (normalizedRole === "student" && enrollmentNumber) {
      userDocData.enrollmentNumber = enrollmentNumber;
    }

    const userDoc = await Model.create(userDocData);
    console.log(
      `User registered successfully: ${userDoc.username} (role: ${userDoc.role})`
    );

    return res.status(201).json({
      message: "Registration successful",
      user: {
        id: userDoc._id,
        email: userDoc.email,
        username: userDoc.username,
        role: userDoc.role,
        enrollmentNumber: userDoc.enrollmentNumber || undefined,
      },
    });
  } catch (error) {
    console.error(`Registration error: ${error.message}`);
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
    console.log(
      `Captcha verification: ${captchaOk} (id: ${captchaId.substring(
        0,
        8
      )}..., value: ${captchaValue})`
    );

    if (!captchaOk) {
      return res.status(400).json({
        message: "Invalid or expired captcha",
      });
    }

    const usernameLower = username.toLowerCase();
    console.log(`Attempting login for username: ${usernameLower}`);

    // Find user by username across all roles
    let [teacher, student, admin] = await Promise.all([
      Teacher.findOne({ username: usernameLower }),
      Student.findOne({ username: usernameLower }),
      Admin.findOne({ username: usernameLower }),
    ]);

    // If not found by username and input looks like a number, try finding student by enrollmentNumber
    if (!teacher && !student && !admin && /^\d+$/.test(username)) {
      console.log(
        `Username looks like enrollment number, trying to find student by enrollmentNumber: ${username}`
      );
      student = await Student.findOne({ enrollmentNumber: username });
    }

    const userDoc = teacher || student || admin;

    if (!userDoc) {
      console.log(`User not found: ${usernameLower}`);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log(`User found: ${userDoc.username} (role: ${userDoc.role})`);

    const passwordMatch = await bcrypt.compare(password, userDoc.passwordHash);
    console.log(`Password match: ${passwordMatch}`);

    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
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
        enrollmentNumber: userDoc.enrollmentNumber || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

//forgot password
router.post("/forgot-password", async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier)
      return res.status(400).json({ message: "Identifier required." });

    let user = await Student.findOne({ email: identifier }) ||
               await Student.findOne({ username: identifier }) ||
               await Teacher.findOne({ email: identifier }) ||
               await Teacher.findOne({ username: identifier });

    if (!user)
      return res.json({ message: "If account exists, reset email sent." });

    const role = user.role;

    // Delete existing token for this user
    await ResetToken.deleteMany({ userId: user._id });

    // Create JWT
    const token = jwt.sign(
      { userId: user._id, role },
      process.env.JWT_RESET_SECRET,
      { expiresIn: "15m" }
    );

    // Hash before saving 
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    await ResetToken.create({
      userId: user._id,
      role,
      tokenHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    // Send email
    await sendEmail(
      user.email,
      "Password Reset Request",
      `
        <h3>Reset your password</h3>
        <p>Click the link below to reset your VGEC Exam Portal password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link expires in 15 minutes.</p>
      `
    );

    res.json({ message: "If account exists, reset email sent." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

//verify token
router.get("/verify-reset-token/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET);
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    console.log("Decoded token:", decoded);
    console.log("Token hash:", tokenHash);
    const record = await ResetToken.findOne({
      userId: decoded.userId,
      tokenHash,
      expiresAt: { $gt: new Date() },
    });
    if(record){
      console.log("Reset token record:", record);
    } else{
      console.log("No valid reset token record found.");
    }
    if (!record) return res.status(400).json({ message: "Invalid or expired token." });

    res.json({ valid: true });
  } catch (err) {
    res.status(400).json({ message: "Invalid or expired token." });
  }
});

//reset password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET);
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const record = await ResetToken.findOne({
      userId: decoded.userId,
      tokenHash,
      expiresAt: { $gt: Date.now() },
    });

    if (!record) 
      return res.status(400).json({ message: "Invalid or expired token." });

    // Find user
    let user;

    if (record.role === "student") user = await Student.findById(decoded.userId);
    else user = await Teacher.findById(decoded.userId);

    // Update password
    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();

    await ResetToken.deleteMany({ userId: user._id });

    res.json({ message: "Password updated successfully." });
  } catch (err) {
    res.status(400).json({ message: "Invalid or expired token." });
  }
});

// ======== DEBUG: GET /api/auth/debug/users =========
// Lists all registered users (DEV ONLY)
router.get("/debug/users", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ message: "Debug endpoint not available" });
  }

  try {
    const students = await Student.find({}, { username: 1, email: 1, role: 1 });
    const teachers = await Teacher.find({}, { username: 1, email: 1, role: 1 });

    return res.status(200).json({
      students,
      teachers,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error fetching users", error: error.message });
  }
});

module.exports = router;
