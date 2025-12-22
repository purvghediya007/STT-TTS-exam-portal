// src/app.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const examRoutes = require("./routes/examRoutes");
const facultyRoutes = require("./routes/facultyRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const errorHandler = require("./middleware/errorHandler");
const studentExamRoutes = require("./routes/studentExamRoutes");
const path = require("path");

dotenv.config();
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
app.use(express.json());

// Simple log to see requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});


// ✅ ADDED: serve local uploads
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"))
);

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

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
