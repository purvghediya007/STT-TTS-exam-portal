// src/app.js
const dotenv = require("dotenv");
dotenv.config(); // ✅ Load environment variables FIRST

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const examRoutes = require("./routes/examRoutes");
const facultyRoutes = require("./routes/facultyRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const errorHandler = require("./middleware/errorHandler");
const studentExamRoutes = require("./routes/studentExamRoutes");
const practiceRoutes = require("../practice/routes/practiceRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const studentAnalyticsRoutes = require("./routes/studentAnalyticsRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const path = require("path");

connectDB();

const app = express();

// Middlewares
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
// app.use(express.json());
app.use(express.json({ limit: '50mb' }));

// Simple log to see requests
app.use((req, res, next) => {
  //console.log(`${req.method} ${req.url}`);
  next();
});

// LEGACY: Serve local uploads for backward compatibility with old submissions
// New audio uploads go directly to S3 - see backend/src/config/s3.js
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
app.use("/api/auth", authRoutes);

// Upload endpoints
app.use("/api/upload", uploadRoutes);

// Health check route (ROOT LEVEL)
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Exams + Questions
app.use("/api/exams", examRoutes);

// Faculty endpoints
app.use("/api/faculty", facultyRoutes);

// Student exam flow
app.use("/api/student", studentExamRoutes);

// Analytics endpoints
app.use("/api/faculty/analytics", analyticsRoutes);
app.use("/api/analytics", studentAnalyticsRoutes);

//practice hub endpoints
app.use("/api/practice", practiceRoutes);

// Feedback endpoint
app.use("/api/feedback", feedbackRoutes);

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
