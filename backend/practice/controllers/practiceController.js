// backend/practice/controllers/practiceController.js
const practiceService = require("../services/practiceService");
const evaluationService = require("../services/evaluationService");
const learningContent = require("../data/learningContent.json");

/**
 * GET /api/practice/topics
 * Returns all available topics with question counts
 */
async function getTopics(req, res) {
  try {
    const topics = await practiceService.getTopics();
    res.json({ success: true, data: topics });
  } catch (error) {
    console.error("Error getting topics:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/practice/learning/:topic
 * Returns theory, formulas, examples, tricks for a topic
 */
async function getLearningContent(req, res) {
  try {
    const { topic } = req.params;
    const topicKey = topic.toLowerCase().replace(/[\s&]+/g, "_");

    // Search learning content
    const content = learningContent.topics.find(
      (t) =>
        t.key === topicKey ||
        t.title.toLowerCase().replace(/[\s&]+/g, "_") === topicKey ||
        t.title.toLowerCase() === topic.toLowerCase()
    );

    if (!content) {
      return res.status(404).json({
        success: false,
        message: `Learning content not found for topic: ${topic}`,
        availableTopics: learningContent.topics.map((t) => t.key),
      });
    }

    res.json({ success: true, data: content });
  } catch (error) {
    console.error("Error getting learning content:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/practice/learning
 * Returns list of all learning topics (sidebar data)
 */
async function getLearningTopics(req, res) {
  try {
    const topics = learningContent.topics.map((t) => ({
      key: t.key,
      title: t.title,
      description: t.description,
      subtopics: t.subtopics || [],
    }));
    res.json({ success: true, data: topics });
  } catch (error) {
    console.error("Error getting learning topics:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/practice/start
 * Start a new practice session or resume an existing one
 * Body: { type: "aptitude"|"technical_mcq"|"technical_spoken", topic: "numbers", count: 20 }
 */
async function startPractice(req, res) {
  try {
    const studentId = req.user.sub || req.user.id;
    const { type, topic, count, company } = req.body;

    if (!type) {
      return res
        .status(400)
        .json({ success: false, message: "type is required" });
    }

    const result = await practiceService.startSession(studentId, {
      type,
      topic,
      count: count || 20,
      company,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error starting practice:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/practice/session/:sessionId
 * Get existing session state for resume
 */
async function getSession(req, res) {
  try {
    const studentId = req.user.sub || req.user.id;
    const { sessionId } = req.params;

    const result = await practiceService.getSession(sessionId, studentId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error getting session:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/practice/save-answer
 * Save MCQ answer immediately
 * Body: { sessionId, questionId, selectedOption, status, currentIndex }
 */
async function saveAnswer(req, res) {
  try {
    const studentId = req.user.sub || req.user.id;
    const { sessionId, questionId, selectedOption, status, currentIndex } =
      req.body;

    if (!sessionId || !questionId) {
      return res
        .status(400)
        .json({
          success: false,
          message: "sessionId and questionId are required",
        });
    }

    const result = await practiceService.saveAnswer(sessionId, studentId, {
      questionId,
      selectedOption,
      status,
      currentIndex,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error saving answer:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/practice/save-audio
 * Save audio answer on "Next" click — replaces on re-record
 * Body: { sessionId, questionId, audioData (Base64), transcript, currentIndex }
 */
async function saveAudio(req, res) {
  try {
    const studentId = req.user.sub || req.user.id;
    const { sessionId, questionId, audioData, transcript, currentIndex } =
      req.body;

    if (!sessionId || !questionId) {
      return res
        .status(400)
        .json({
          success: false,
          message: "sessionId and questionId are required",
        });
    }

    const result = await practiceService.saveAudio(sessionId, studentId, {
      questionId,
      audioData,
      transcript,
      currentIndex,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error saving audio:", error);
    // Check if it's a re-record limit error
    if (error.message.includes("Re-record limit")) {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/practice/submit
 * Submit session and run evaluation
 * Body: { sessionId }
 */
async function submitPractice(req, res) {
  try {
    const studentId = req.user.sub || req.user.id;
    const { sessionId } = req.body;

    if (!sessionId) {
      return res
        .status(400)
        .json({ success: false, message: "sessionId is required" });
    }

    const result = await evaluationService.evaluateSession(
      sessionId,
      studentId
    );
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error submitting practice:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/practice/update-time
 * Update remaining time (called periodically)
 * Body: { sessionId, remainingTime }
 */
async function updateTime(req, res) {
  try {
    const studentId = req.user.sub || req.user.id;
    const { sessionId, remainingTime } = req.body;

    await practiceService.updateTime(sessionId, studentId, remainingTime);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/practice/companies
 * Returns all companies with question counts
 */
async function getCompanies(req, res) {
  try {
    const companies = await practiceService.getCompanies();
    res.json({ success: true, data: companies });
  } catch (error) {
    console.error("Error getting companies:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/practice/history
 * Returns student's practice history with trends
 */
async function getHistory(req, res) {
  try {
    const studentId = req.user.sub || req.user.id;
    const result = await practiceService.getHistory(studentId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error getting history:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getTopics,
  getLearningContent,
  getLearningTopics,
  startPractice,
  getSession,
  saveAnswer,
  saveAudio,
  submitPractice,
  updateTime,
  getCompanies,
  getHistory,
};
