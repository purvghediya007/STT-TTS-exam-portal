// src/routes/analyticsRoutes.js
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const {
  getSemesterOverviewController,
  getStudentListBySemesterController,
  getExamAnalysisController,
} = require("../controllers/performanceAnalyticsController");

const router = express.Router();

/**
 * GET /api/faculty/analytics/overview
 * Get overview of all 8 semesters with performance metrics
 */
router.get(
  "/overview",
  authMiddleware,
  requireRole("teacher"),
  getSemesterOverviewController
);

/**
 * GET /api/faculty/analytics/semester/:semesterNumber
 * Get student list for specific semester with performance metrics
 */
router.get(
  "/semester/:semesterNumber",
  authMiddleware,
  requireRole("teacher"),
  getStudentListBySemesterController
);

router.get(
  "/exam/:examId",
  authMiddleware,
  requireRole("teacher"),
  getExamAnalysisController
);

module.exports = router;
