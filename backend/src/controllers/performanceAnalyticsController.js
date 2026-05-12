// src/controllers/performanceAnalyticsController.js
const {
  getSemesterOverview,
  getStudentsBySemester,
  getExamAnalysis,
} = require("../services/performanceAnalyticsService");
const analyticsService = require("../services/analyticsService");

/**
 * GET /api/faculty/analytics/overview
 * Get overview of all 8 semesters with performance metrics
 * Faculty can only see data for their department
 */
const getSemesterOverviewController = async (req, res, next) => {
  try {
    const teacherId = req.user.sub;

    if (!teacherId) {
      return res
        .status(401)
        .json({ message: "Not authorized, teacher ID not found" });
    }

    const semesterOverview = await getSemesterOverview(teacherId);

    return res.status(200).json({
      success: true,
      data: semesterOverview,
    });
  } catch (error) {
    console.error("Error in getSemesterOverviewController:", error);
    next(error);
  }
};

/**
 * GET /api/faculty/analytics/semester/:semesterNumber
 * Get student list for specific semester with performance metrics
 * Faculty can only see students from their department
 * Query params: page (optional), limit (optional)
 */
const getStudentListBySemesterController = async (req, res, next) => {
  try {
    const teacherId = req.user.sub;
    const { semesterNumber } = req.params;
    const { page = 1, limit = 50 } = req.query;

    if (!teacherId) {
      return res
        .status(401)
        .json({ message: "Not authorized, teacher ID not found" });
    }

    if (!semesterNumber || semesterNumber < 1 || semesterNumber > 8) {
      return res.status(400).json({
        message: "Invalid semester number. Must be between 1 and 8.",
      });
    }

    const result = await getStudentsBySemester(
      teacherId,
      semesterNumber,
      parseInt(page),
      parseInt(limit)
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error in getStudentListBySemesterController:", error);
    next(error);
  }
};

const getStudentAnalyticsController = async (req, res, next) => {
  try {
    const studentId = req.params.studentId;
    const data = await analyticsService.buildAnalytics(studentId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error in getStudentAnalyticsController:", error);
    next(error);
  }
};

const getExamAnalysisController = async (req, res, next) => {
  try {
    const teacherId = req.user.sub
    const { examId } = req.params

    if (!teacherId) {
      return res
        .status(401)
        .json({ message: "Not authorized, teacher ID not found" })
    }

    if (!examId) {
      return res.status(400).json({ message: "Exam ID is required" })
    }

    const data = await getExamAnalysis(teacherId, examId)

    return res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    console.error("Error in getExamAnalysisController:", error)
    next(error)
  }
}

module.exports = {
  getSemesterOverviewController,
  getStudentListBySemesterController,
  getStudentAnalyticsController,
  getExamAnalysisController,
};
