// backend/practice/controllers/codingController.js
const codingService = require("../services/codingService");
const judgeService = require("../services/judgeService");

/**
 * GET /api/practice/coding/problems
 * Query: ?category=dsa&topic=arrays&difficulty=easy
 */
async function getProblems(req, res) {
  try {
    const studentId = req.user.sub || req.user.id;
    const { category, topic, difficulty } = req.query;
    const problems = await codingService.getProblemsWithStatus(studentId, {
      category,
      topic,
      difficulty,
    });
    res.json({ success: true, data: problems });
  } catch (error) {
    console.error("Error getting coding problems:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/practice/coding/problems/:slug
 */
async function getProblem(req, res) {
  try {
    const problem = await codingService.getProblem(req.params.slug);
    res.json({ success: true, data: problem });
  } catch (error) {
    if (error.message === "Problem not found") {
      return res.status(404).json({ success: false, message: error.message });
    }
    console.error("Error getting problem:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/practice/coding/run
 * Run code against sample (visible) test cases only
 * Body: { slug, language, code }
 */
async function runCode(req, res) {
  try {
    const studentId = req.user.sub || req.user.id;
    const { slug, language, code } = req.body;

    if (!slug || !language || !code) {
      return res.status(400).json({
        success: false,
        message: "slug, language, and code are required",
      });
    }

    const result = await codingService.runCode(studentId, slug, language, code);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error running code:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/practice/coding/submit
 * Submit code — run against ALL test cases + save submission
 * Body: { slug, language, code }
 */
async function submitCode(req, res) {
  try {
    const studentId = req.user.sub || req.user.id;
    const { slug, language, code } = req.body;

    if (!slug || !language || !code) {
      return res.status(400).json({
        success: false,
        message: "slug, language, and code are required",
      });
    }

    const result = await codingService.submitCode(studentId, slug, language, code);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error submitting code:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/practice/coding/submissions/:slug
 * Get student's past submissions for a problem
 */
async function getSubmissions(req, res) {
  try {
    const studentId = req.user.sub || req.user.id;
    const submissions = await codingService.getSubmissions(studentId, req.params.slug);
    res.json({ success: true, data: submissions });
  } catch (error) {
    console.error("Error getting submissions:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/practice/coding/progress
 * Get student's overall coding progress
 */
async function getProgress(req, res) {
  try {
    const studentId = req.user.sub || req.user.id;
    const progress = await codingService.getProgress(studentId);
    res.json({ success: true, data: progress });
  } catch (error) {
    console.error("Error getting progress:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/practice/coding/topics
 * Get available topics for filtering
 */
async function getTopics(req, res) {
  try {
    const topics = await codingService.getTopics();
    res.json({ success: true, data: topics });
  } catch (error) {
    console.error("Error getting topics:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/practice/coding/health
 * Check if Judge0 is running
 */
async function healthCheck(req, res) {
  const health = await judgeService.checkHealth();
  res.json({ success: true, data: health });
}

module.exports = {
  getProblems,
  getProblem,
  runCode,
  submitCode,
  getSubmissions,
  getProgress,
  getTopics,
  healthCheck,
};
