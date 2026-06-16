// backend/practice/routes/practiceRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../../src/middleware/authMiddleware");
const practiceController = require("../controllers/practiceController");
const codingRoutes = require("./codingRoutes");

// All routes require authentication
router.use(authMiddleware);

// Mount coding practice routes at /api/practice/coding
router.use("/coding", codingRoutes);

// Increase body size limit for audio data (Base64 audio can be large)
router.use(express.json({ limit: "50mb" }));

// Learning content
router.get("/learning", practiceController.getLearningTopics);
router.get("/learning/:topic", practiceController.getLearningContent);

// Topics
router.get("/topics", practiceController.getTopics);

// Practice session management
router.post("/start", practiceController.startPractice);
router.get("/session/:sessionId", practiceController.getSession);

// Answer saving (immediate)
router.post("/save-answer", practiceController.saveAnswer);
router.post("/save-audio", practiceController.saveAudio);

// Timer sync
router.post("/update-time", practiceController.updateTime);

// Company-wise practice
router.get("/companies", practiceController.getCompanies);

// Practice history & analytics
router.get("/history", practiceController.getHistory);

// Submit and evaluate
router.post("/submit", practiceController.submitPractice);

module.exports = router;
