// backend/practice/services/practiceService.js
const PracticeQuestion = require("../models/PracticeQuestion");
const PracticeSession = require("../models/PracticeSession");

/**
 * Get all available topics with question counts
 */
async function getTopics() {
  const aptitudeTopics = await PracticeQuestion.aggregate([
    { $match: { category: "aptitude" } },
    { $group: { _id: "$topic", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  const technicalMcqTopics = await PracticeQuestion.aggregate([
    { $match: { category: "technical_mcq" } },
    { $group: { _id: "$topic", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  const technicalSpokenTopics = await PracticeQuestion.aggregate([
    { $match: { category: "technical_spoken" } },
    { $group: { _id: "$topic", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  return {
    aptitude: aptitudeTopics.map((t) => ({ topic: t._id, count: t.count })),
    technical_mcq: technicalMcqTopics.map((t) => ({
      topic: t._id,
      count: t.count,
    })),
    technical_spoken: technicalSpokenTopics.map((t) => ({
      topic: t._id,
      count: t.count,
    })),
  };
}

/**
 * Calculate time limit based on question count and type
 */
function calculateTimeLimit(count, type) {
  if (type === "technical_spoken") {
    // 3 minutes per spoken question
    return count * 180;
  }
  // 1.5 minutes per MCQ question
  return Math.ceil(count * 90);
}

/**
 * Start a new practice session
 */
async function startSession(studentId, { type, topic, count, company }) {
  // Check if there's an active session already
  const existingSession = await PracticeSession.findOne({
    studentId,
    status: "active",
  });

  if (existingSession) {
    // Return existing session for resume
    const populatedSession = await PracticeSession.findById(
      existingSession._id
    ).populate("questions");
    return {
      sessionId: existingSession._id,
      questions: populatedSession.questions,
      answers: existingSession.answers,
      currentIndex: existingSession.currentIndex,
      timeLimit: existingSession.timeLimit,
      remainingTime: existingSession.remainingTime,
      resumed: true,
      maxReRecords: existingSession.maxReRecords,
    };
  }

  // Build query for questions
  const query = { category: type };
  if (topic && topic !== "mixed") {
    query.topic = topic;
  }
  // Company filter — only pick questions tagged with this company
  if (company) {
    query.companies = { $in: [company] };
  }

  // Get available questions and randomize
  const availableQuestions = await PracticeQuestion.find(query);
  if (availableQuestions.length === 0) {
    throw new Error(
      `No questions available for type=${type}, topic=${topic || "mixed"}${company ? ", company=" + company : ""}`
    );
  }

  // Shuffle and pick requested count
  const shuffled = availableQuestions.sort(() => Math.random() - 0.5);
  const selectedQuestions = shuffled.slice(
    0,
    Math.min(count || 20, shuffled.length)
  );
  const questionIds = selectedQuestions.map((q) => q._id);
  const timeLimit = calculateTimeLimit(selectedQuestions.length, type);

  // Initialize answers array
  const answers = questionIds.map((qId) => ({
    questionId: qId,
    selectedOption: null,
    audioData: null,
    transcript: null,
    reRecordCount: 0,
    status: "not_answered",
  }));

  // Create session
  const session = await PracticeSession.create({
    studentId,
    type,
    topic: topic || "mixed",
    company: company || null,
    status: "active",
    questions: questionIds,
    answers,
    currentIndex: 0,
    questionCount: selectedQuestions.length,
    timeLimit,
    remainingTime: timeLimit,
    totalMarks: selectedQuestions.reduce(
      (sum, q) => sum + (q.marks || 1),
      0
    ),
    maxReRecords: 2,
  });

  return {
    sessionId: session._id,
    questions: selectedQuestions,
    answers: session.answers,
    currentIndex: 0,
    timeLimit,
    remainingTime: timeLimit,
    resumed: false,
    maxReRecords: 2,
  };
}

/**
 * Get an existing session for resume
 */
async function getSession(sessionId, studentId) {
  const session = await PracticeSession.findOne({
    _id: sessionId,
    studentId,
  }).populate("questions");

  if (!session) {
    throw new Error("Session not found");
  }

  // Check if expired
  if (session.status === "active") {
    const elapsed = (Date.now() - session.startedAt.getTime()) / 1000;
    if (elapsed >= session.timeLimit) {
      session.status = "expired";
      await session.save();
    }
  }

  return {
    sessionId: session._id,
    type: session.type,
    topic: session.topic,
    status: session.status,
    questions: session.questions,
    answers: session.answers,
    currentIndex: session.currentIndex,
    timeLimit: session.timeLimit,
    remainingTime: session.remainingTime,
    maxReRecords: session.maxReRecords,
    score: session.score,
    totalMarks: session.totalMarks,
    accuracy: session.accuracy,
  };
}

/**
 * Save an MCQ answer immediately
 */
async function saveAnswer(sessionId, studentId, { questionId, selectedOption, status, currentIndex }) {
  const session = await PracticeSession.findOne({
    _id: sessionId,
    studentId,
    status: "active",
  });

  if (!session) {
    throw new Error("Active session not found");
  }

  // Find the answer entry and update
  const answerIdx = session.answers.findIndex(
    (a) => a.questionId.toString() === questionId
  );
  if (answerIdx === -1) {
    throw new Error("Question not found in session");
  }

  session.answers[answerIdx].selectedOption = selectedOption;
  session.answers[answerIdx].status = status || "answered";

  // Update current index
  if (currentIndex !== undefined) {
    session.currentIndex = currentIndex;
  }

  await session.save();
  return { saved: true };
}

/**
 * Save audio answer (on Next click) — replaces existing if re-recording
 */
async function saveAudio(sessionId, studentId, { questionId, audioData, transcript, currentIndex }) {
  const session = await PracticeSession.findOne({
    _id: sessionId,
    studentId,
    status: "active",
  });

  if (!session) {
    throw new Error("Active session not found");
  }

  const answerIdx = session.answers.findIndex(
    (a) => a.questionId.toString() === questionId
  );
  if (answerIdx === -1) {
    throw new Error("Question not found in session");
  }

  const answer = session.answers[answerIdx];

  // Check re-record limit (server-enforced)
  if (answer.audioData && answer.reRecordCount >= session.maxReRecords) {
    throw new Error(
      `Re-record limit reached (${session.maxReRecords}). Cannot replace audio.`
    );
  }

  // If replacing existing audio, increment re-record count
  if (answer.audioData) {
    answer.reRecordCount += 1;
  }

  answer.audioData = audioData;
  answer.transcript = transcript || answer.transcript;
  answer.status = "answered";

  // Update current index
  if (currentIndex !== undefined) {
    session.currentIndex = currentIndex;
  }

  await session.save();
  return {
    saved: true,
    reRecordCount: answer.reRecordCount,
    maxReRecords: session.maxReRecords,
  };
}

/**
 * Update remaining time (called periodically from frontend)
 */
async function updateTime(sessionId, studentId, remainingTime) {
  await PracticeSession.updateOne(
    { _id: sessionId, studentId, status: "active" },
    { remainingTime }
  );
  return { updated: true };
}

/**
 * Get all companies with question counts
 */
async function getCompanies() {
  const result = await PracticeQuestion.aggregate([
    { $unwind: "$companies" },
    {
      $group: {
        _id: "$companies",
        totalQuestions: { $sum: 1 },
        aptitudeCount: {
          $sum: { $cond: [{ $eq: ["$category", "aptitude"] }, 1, 0] },
        },
        technicalMcqCount: {
          $sum: { $cond: [{ $eq: ["$category", "technical_mcq"] }, 1, 0] },
        },
        spokenCount: {
          $sum: { $cond: [{ $eq: ["$category", "technical_spoken"] }, 1, 0] },
        },
      },
    },
    { $sort: { totalQuestions: -1 } },
  ]);

  return result.map((r) => ({
    company: r._id,
    totalQuestions: r.totalQuestions,
    aptitudeCount: r.aptitudeCount,
    technicalMcqCount: r.technicalMcqCount,
    spokenCount: r.spokenCount,
  }));
}

/**
 * Get practice history with trend data for a student
 */
async function getHistory(studentId) {
  const sessions = await PracticeSession.find({
    studentId,
    status: "completed",
  })
    .sort({ completedAt: -1 })
    .limit(50)
    .select(
      "type topic company score totalMarks accuracy questionCount startedAt completedAt"
    );

  // Calculate trends
  const history = sessions.map((s, i) => {
    const prev = sessions[i + 1]; // previous session (older)
    let trend = null;
    if (prev && prev.totalMarks > 0 && s.totalMarks > 0) {
      const currentPct = (s.score / s.totalMarks) * 100;
      const prevPct = (prev.score / prev.totalMarks) * 100;
      trend = Math.round(currentPct - prevPct);
    }

    return {
      sessionId: s._id,
      type: s.type,
      topic: s.topic,
      company: s.company,
      score: s.score,
      totalMarks: s.totalMarks,
      accuracy: s.accuracy,
      questionCount: s.questionCount,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      trend, // positive = improved, negative = declined
    };
  });

  // Category-wise stats
  const categoryStats = {};
  for (const s of sessions) {
    if (!categoryStats[s.type]) {
      categoryStats[s.type] = { sessions: 0, totalScore: 0, totalMarks: 0 };
    }
    categoryStats[s.type].sessions++;
    categoryStats[s.type].totalScore += s.score || 0;
    categoryStats[s.type].totalMarks += s.totalMarks || 0;
  }

  // Calculate streak (consecutive days practiced)
  let streak = 0;
  if (sessions.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dates = [...new Set(
      sessions.map((s) => {
        const d = new Date(s.completedAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    )].sort((a, b) => b - a);

    for (let i = 0; i < dates.length; i++) {
      const expected = today.getTime() - i * 86400000;
      if (dates[i] === expected) {
        streak++;
      } else {
        break;
      }
    }
  }

  return {
    sessions: history,
    totalSessions: sessions.length,
    categoryStats,
    streak,
  };
}

module.exports = {
  getTopics,
  calculateTimeLimit,
  startSession,
  getSession,
  saveAnswer,
  saveAudio,
  updateTime,
  getCompanies,
  getHistory,
};
