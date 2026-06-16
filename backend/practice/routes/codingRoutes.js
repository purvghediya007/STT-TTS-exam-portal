// backend/practice/routes/codingRoutes.js
const express = require("express");
const router = express.Router();
const codingController = require("../controllers/codingController");

// All routes are already behind authMiddleware from parent router

// Health check (verify Judge0 is running)
router.get("/health", codingController.healthCheck);

// Topics for filtering
router.get("/topics", codingController.getTopics);

// Problem listing and details
router.get("/problems", codingController.getProblems);
router.get("/problems/:slug", codingController.getProblem);

// Code execution
router.post("/run", codingController.runCode);
router.post("/submit", codingController.submitCode);

// Submissions and progress
router.get("/submissions/:slug", codingController.getSubmissions);
router.get("/progress", codingController.getProgress);

module.exports = router;
