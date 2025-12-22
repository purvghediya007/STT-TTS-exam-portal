// src/routes/studentExamRoutes.js
const express = require("express");
const Exam = require("../models/Exam");
const Question = require("../models/Question");
const StudentExamAttempt = require("../models/StudentExamAttempt");
const StudentAnswer = require("../models/StudentAnswer");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const {
  evaluateAnswerWithAI,
  evaluateMCQAnswer,
} = require("../services/evaluationService");

const router = express.Router();

// Map question to student-safe view (no expectedAnswer, no sensitive fields)
const mapQuestionForStudent = (q) => {
  const base = {
    id: q._id,
    question: q.text, // Return as 'question' to match frontend expectations
    text: q.text, // Also return as 'text' for compatibility
    type: q.type,
    marks: q.marks,
    points: q.marks, // Also return as 'points' for frontend compatibility
    instruction: q.instruction,
    media: q.media,
    order: q.order,
    ttsAudioUrl: q.ttsAudioUrl,
    requiresAudio: q.requiresAudio,
  };

  // For MCQ, include options but not the isCorrect flag
  if (q.type === "mcq" && q.options && q.options.length > 0) {
    base.options = q.options.map((opt) => ({
      text: opt.text,
      // Don't expose isCorrect to student
    }));
  }

  return base;
};

/**
 * Helper function to transform exam object for frontend
 * Maps MongoDB field names to frontend field names
 */
function transformExamForFrontend(examObj) {
  return {
    ...examObj,
    id: examObj._id,
    startsAt: examObj.startTime,
    endsAt: examObj.endTime,
    durationMin: examObj.durationMinutes,
    pointsTotal: examObj.pointsTotal,
    timePerQuestionSec: examObj.timePerQuestion,
    attemptsLeft: examObj.attemptsAllowed,
    allowedReRecords: examObj.allowedReRecords,
    strictMode: examObj.strictMode,
    shortDescription: examObj.shortDescription,
    instructions: examObj.instructions,
    marks: examObj.marks,
    teacherName: examObj.teacherId?.username || "Unknown Teacher",
  };
}

//
// ---------- 0) LIST ALL PUBLISHED EXAMS FOR STUDENT ----------
// GET /api/student/exams
// Returns all published exams (upcoming, live, and finished)
//
router.get(
  "/exams",
  authMiddleware,
  requireRole("student"),
  async (req, res, next) => {
    try {
      const { status, limit = 100, page = 1 } = req.query;
      const studentId = req.user.sub;

      // Build filter for published exams only (students can't see draft or archived)
      const filter = { status: "published" };

      if (status && status !== "all") {
        const now = new Date();
        if (status === "upcoming") {
          filter.startTime = { $gt: now };
        } else if (status === "live") {
          filter.startTime = { $lte: now };
          filter.endTime = { $gte: now };
        } else if (status === "finished") {
          filter.endTime = { $lt: now };
        }
      }

      const skip = (page - 1) * limit;

      const exams = await Exam.find(filter)
        .populate("teacherId", "username email")
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Exam.countDocuments(filter);

      // Find any existing attempts for this student on these exams
      const attempts = await StudentExamAttempt.find({
        studentId,
        examId: { $in: exams.map((e) => e._id) },
      });

      const attemptsByExam = new Map();
      attempts.forEach((a) => attemptsByExam.set(a.examId.toString(), a));

      // Transform exams for frontend
      const transformedExams = exams.map((exam) => {
        const attempt = attemptsByExam.get(exam._id.toString());
        return {
          ...transformExamForFrontend(exam.toObject()),
          attemptStatus: attempt ? attempt.status : null,
        };
      });

      return res.status(200).json({
        exams: transformedExams,
        page: parseInt(page),
        limit: parseInt(limit),
        total,
      });
    } catch (error) {
      next(error);
    }
  }
);

//
// ---------- 0.5) GET EXAM SUMMARY ----------
// GET /api/student/exams/:examId/summary
// Get details of a specific exam for student
//
router.get(
  "/exams/:examId/summary",
  authMiddleware,
  requireRole("student"),
  async (req, res, next) => {
    try {
      const { examId } = req.params;

      const exam = await Exam.findOne({
        _id: examId,
        status: "published",
      }).populate("teacherId", "username email");

      if (!exam) {
        return res
          .status(404)
          .json({ message: "Exam not found or not published" });
      }

      const questionCount = await Question.countDocuments({ examId });

      return res.status(200).json({
        ...transformExamForFrontend(exam.toObject()),
        questionCount,
      });
    } catch (error) {
      next(error);
    }
  }
);

//
// ---------- 0.55) GET EXAM SUBMISSIONS BY STUDENT ----------
// GET /api/student/exams/:examId/submissions?studentId=XXX
// Get all submissions for a specific exam by a specific student
//
router.get(
  "/exams/:examId/submissions",
  authMiddleware,
  async (req, res, next) => {
    try {
      const { examId } = req.params;
      const { studentId } = req.query;

      if (!studentId) {
        return res
          .status(400)
          .json({ message: "studentId query parameter is required" });
      }

      // Find all attempts for this exam and student
      const attempts = await StudentExamAttempt.find({
        examId,
        studentId,
      })
        .sort({ startedAt: -1 })
        .populate(
          "examId",
          "title examCode startTime endTime durationMinutes pointsTotal"
        );

      const submissions = attempts.map((attempt) => ({
        attemptId: attempt._id,
        examId: attempt.examId?._id,
        studentId: attempt.studentId,
        status: attempt.status,
        startedAt: attempt.startedAt,
        finishedAt: attempt.finishedAt,
        totalScore: attempt.totalScore,
        maxScore: attempt.maxScore,
        percentage:
          attempt.maxScore > 0
            ? Math.round((attempt.totalScore / attempt.maxScore) * 100)
            : 0,
      }));

      return res.status(200).json({ submissions });
    } catch (error) {
      next(error);
    }
  }
);

//
// ---------- 0.6) GET EXAM QUESTIONS ----------
// GET /api/student/exams/:examId/questions
// Get all questions for a specific exam (student view - no answers)
//
router.get(
  "/exams/:examId/questions",
  authMiddleware,
  requireRole("student"),
  async (req, res, next) => {
    try {
      const { examId } = req.params;

      const exam = await Exam.findOne({
        _id: examId,
        status: "published",
      });

      if (!exam) {
        return res
          .status(404)
          .json({ message: "Exam not found or not published" });
      }

      const questions = await Question.find({ examId }).sort({ order: 1 });

      // Map to student-safe view
      const studentQuestions = questions.map(mapQuestionForStudent);

      return res.status(200).json({ questions: studentQuestions });
    } catch (error) {
      next(error);
    }
  }
);

//
// ---------- 1) LIST AVAILABLE EXAMS FOR STUDENT ----------
// GET /api/student/exams/available
//
router.get(
  "/exams/available",
  authMiddleware,
  requireRole("student"),
  async (req, res, next) => {
    try {
      const now = new Date();
      const studentId = req.user.sub;

      // Exams that are published and whose start/end window includes now
      const exams = await Exam.find({
        status: "published",
        startTime: { $lte: now },
        endTime: { $gte: now },
      })
        .sort({ startTime: 1 })
        .select("title description examCode startTime endTime durationMinutes");

      // Find any existing attempts for this student on these exams
      const attempts = await StudentExamAttempt.find({
        studentId,
        examId: { $in: exams.map((e) => e._id) },
      });

      const attemptsByExam = new Map();
      attempts.forEach((a) => attemptsByExam.set(a.examId.toString(), a));

      const result = exams.map((exam) => {
        const attempt = attemptsByExam.get(exam._id.toString());
        return {
          id: exam._id,
          title: exam.title,
          description: exam.description,
          examCode: exam.examCode,
          startTime: exam.startTime,
          endTime: exam.endTime,
          durationMinutes: exam.durationMinutes,
          attemptStatus: attempt ? attempt.status : null,
        };
      });

      return res.status(200).json({ exams: result });
    } catch (error) {
      next(error);
    }
  }
);

//
// ---------- 2) START EXAM (CREATE ATTEMPT) ----------
// POST /api/student/exams/:examId/start
//
router.post(
  "/exams/:examId/start",
  authMiddleware,
  requireRole("student"),
  async (req, res, next) => {
    try {
      const { examId } = req.params;
      const studentId = req.user.sub;
      const now = new Date();

      const exam = await Exam.findById(examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }

      if (exam.status !== "published") {
        return res.status(400).json({ message: "Exam is not published" });
      }

      if (!exam.startTime || !exam.endTime || !exam.durationMinutes) {
        return res.status(400).json({
          message: "Exam schedule or duration is not set",
        });
      }

      if (now < exam.startTime) {
        return res.status(400).json({
          message: "Exam has not started yet",
        });
      }

      if (now > exam.endTime) {
        return res.status(400).json({
          message: "Exam has already ended",
        });
      }

      // Check if student has remaining attempts
      const attemptCount = await StudentExamAttempt.countDocuments({
        examId,
        studentId,
      });

      // Get allowed attempts from exam (default to 1 if not set)
      const allowedAttempts = exam.attemptsAllowed || 1;

      // Check if there's an in-progress attempt
      let attempt = await StudentExamAttempt.findOne({
        examId,
        studentId,
        status: "in_progress",
      });

      if (attempt) {
        return res.status(200).json({
          message: "Exam already started",
          attemptId: attempt._id.toString(),
          expiresAt: attempt.deadlineAt.toISOString(),
          firstQuestionId: null,
        });
      }

      // Check if student has exhausted their attempts
      if (attemptCount >= allowedAttempts) {
        return res.status(400).json({
          message: "You have exhausted all your attempts for this exam",
          error: "attempts_exhausted",
          attemptsUsed: attemptCount,
          allowedAttempts: allowedAttempts,
        });
      }

      // Compute deadline: min(now + duration, exam.endTime)
      const deadlineByDuration = new Date(
        now.getTime() + exam.durationMinutes * 60 * 1000
      );
      const deadlineAt =
        deadlineByDuration < exam.endTime ? deadlineByDuration : exam.endTime;

      attempt = await StudentExamAttempt.create({
        examId,
        studentId,
        status: "in_progress",
        startedAt: now,
        deadlineAt,
      });

      return res.status(201).json({
        message: "Exam attempt started",
        attemptId: attempt._id.toString(),
        expiresAt: deadlineAt.toISOString(),
        firstQuestionId: null,
      });
    } catch (error) {
      next(error);
    }
  }
);

//
// ---------- 3) GET QUESTIONS FOR AN ATTEMPT ----------
// GET /api/student/attempts/:attemptId/questions
//
router.get(
  "/attempts/:attemptId/questions",
  authMiddleware,
  requireRole("student"),
  async (req, res, next) => {
    try {
      const { attemptId } = req.params;
      const studentId = req.user.sub;
      const now = new Date();

      const attempt = await StudentExamAttempt.findById(attemptId);
      if (!attempt) {
        return res.status(404).json({ message: "Attempt not found" });
      }

      if (attempt.studentId.toString() !== studentId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (attempt.status !== "in_progress") {
        return res.status(400).json({
          message: "Attempt is not in progress",
          status: attempt.status,
        });
      }

      if (now > attempt.deadlineAt) {
        attempt.status = "expired";
        await attempt.save();
        return res.status(400).json({
          message: "Attempt time is over",
        });
      }

      const questions = await Question.find({
        examId: attempt.examId,
      }).sort({ order: 1 });

      const safeQuestions = questions.map(mapQuestionForStudent);

      return res.status(200).json({
        attemptId: attempt._id,
        examId: attempt.examId,
        deadlineAt: attempt.deadlineAt,
        questions: safeQuestions,
      });
    } catch (error) {
      next(error);
    }
  }
);

//
// ---------- 3.5) SUBMIT ANSWERS BY EXAM ID ----------
// POST /api/student/exams/:examId/submit
// Frontend endpoint that accepts examId instead of attemptId
//
router.post(
  "/exams/:examId/submit",
  authMiddleware,
  requireRole("student"),
  async (req, res, next) => {
    try {
      const { examId } = req.params;
      const { attemptId, answers, mediaAnswers, timeSpent, startedAt } =
        req.body;
      const studentId = req.user.sub;
      const now = new Date();

      if (!attemptId) {
        return res.status(400).json({ message: "attemptId is required" });
      }

      console.log("=== SUBMIT ENDPOINT ===");
      console.log("Received attemptId:", attemptId);
      console.log(
        "Is valid MongoDB ID format:",
        /^[0-9a-f]{24}$/.test(attemptId)
      );

      // Verify the attempt belongs to this student and exam
      let attempt;
      try {
        attempt = await StudentExamAttempt.findById(attemptId);
      } catch (err) {
        console.error("Error finding attempt by ID:", err.message);
        // If ID format is invalid, try to find by student and exam
        attempt = await StudentExamAttempt.findOne({
          examId,
          studentId,
          status: "in_progress",
        });
        if (!attempt) {
          return res.status(400).json({
            message:
              "Invalid attemptId format and no active attempt found for this exam",
            receivedAttemptId: attemptId,
          });
        }
      }
      if (!attempt) {
        return res.status(404).json({ message: "Attempt not found" });
      }

      if (attempt.studentId.toString() !== studentId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (attempt.examId.toString() !== examId) {
        return res
          .status(400)
          .json({ message: "Exam ID mismatch with attempt" });
      }

      // Check if exam is still live
      const exam = await Exam.findById(examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }

      if (now > attempt.deadlineAt) {
        attempt.status = "expired";
        await attempt.save();
        return res.status(400).json({ message: "Attempt time is over" });
      }

      // Store mediaAnswers as StudentAnswers if provided
      if (mediaAnswers && typeof mediaAnswers === "object") {
        const questions = await Question.find({
          examId: examId,
        }).sort({ order: 1 });

        for (const q of questions) {
          const mediaAnswer = mediaAnswers[q._id.toString()];
          if (mediaAnswer) {
            await StudentAnswer.findOneAndUpdate(
              { attemptId: attempt._id, questionId: q._id },
              { answerText: mediaAnswer },
              { upsert: true }
            );
          }
        }
      }

      // Store regular answers (MCQ and descriptive) if provided
      if (answers && Array.isArray(answers)) {
        for (const answer of answers) {
          if (!answer.questionId) continue;

          const answerUpdate = {
            attemptId: attempt._id,
            questionId: answer.questionId,
          };

          // For MCQ answers
          if (answer.selectedOptionIndex !== undefined) {
            answerUpdate.selectedOptionIndex = answer.selectedOptionIndex;
          }

          // For descriptive answers
          if (answer.answerText) {
            answerUpdate.answerText = answer.answerText;
          }

          // For audio/interview answers - store recording URLs from Cloudinary
          if (answer.recordingUrls && Array.isArray(answer.recordingUrls)) {
            answerUpdate.recordingUrls = answer.recordingUrls;
            console.log(
              `Storing ${answer.recordingUrls.length} recording URLs for question ${answer.questionId}`
            );
          }

          await StudentAnswer.findOneAndUpdate(
            { attemptId: attempt._id, questionId: answer.questionId },
            answerUpdate,
            { upsert: true }
          );
        }
      }

      // Mark attempt as submitted
      attempt.status = "submitted";
      attempt.finishedAt = now;
      if (timeSpent) {
        attempt.timeSpent = timeSpent;
      }
      await attempt.save();

      // Return success response
      return res.status(200).json({
        submissionId: attempt._id,
        score: 0,
        maxScore: exam.pointsTotal || 0,
        percentage: 0,
        message: "Exam submitted successfully",
      });
    } catch (error) {
      console.error("Error submitting exam:", error);
      next(error);
    }
  }
);

//
// ---------- 4) SUBMIT ANSWERS & FINISH + AI EVALUATION ----------
// POST /api/student/attempts/:attemptId/submit
//
// Body:
// {
//   "answers": [
//     { "questionId": "...", "answerText": "..." },
//     ...
//   ]
// }
//
router.post(
  "/attempts/:attemptId/submit",
  authMiddleware,
  requireRole("student"),
  async (req, res, next) => {
    try {
      const { attemptId } = req.params;
      const { answers } = req.body;
      const studentId = req.user.sub;
      const now = new Date();

      if (!answers || !Array.isArray(answers) || answers.length === 0) {
        return res
          .status(400)
          .json({ message: "answers array is required and cannot be empty" });
      }

      const attempt = await StudentExamAttempt.findById(attemptId);
      if (!attempt) {
        return res.status(404).json({ message: "Attempt not found" });
      }

      if (attempt.studentId.toString() !== studentId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (attempt.status !== "in_progress") {
        return res.status(400).json({
          message: "Attempt is not in progress",
          status: attempt.status,
        });
      }

      if (now > attempt.deadlineAt) {
        attempt.status = "expired";
        await attempt.save();
        return res.status(400).json({
          message: "Attempt time is over",
        });
      }

      const exam = await Exam.findById(attempt.examId);
      if (!exam) {
        return res.status(500).json({
          message: "Exam not found for this attempt",
        });
      }

      const questions = await Question.find({
        examId: exam._id,
      });

      const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));

      // 1) Save / upsert all answers first
      const bulkOps = [];

      for (const ans of answers) {
        const q = questionMap.get(String(ans.questionId));
        if (!q) continue; // ignore invalid question id

        const updateData = {};

        // Handle MCQ answers
        if (q.type === "mcq") {
          if (
            ans.selectedOptionIndex !== null &&
            ans.selectedOptionIndex !== undefined
          ) {
            updateData.selectedOptionIndex = ans.selectedOptionIndex;
          }
        } else {
          // Handle text answers for descriptive questions
          updateData.answerText = ans.answerText || "";
        }

        bulkOps.push({
          updateOne: {
            filter: {
              attemptId: attempt._id,
              questionId: q._id,
              studentId,
              examId: exam._id,
            },
            update: {
              $set: updateData,
            },
            upsert: true,
          },
        });
      }

      if (bulkOps.length > 0) {
        await StudentAnswer.bulkWrite(bulkOps);
      }

      // 2) Fetch all saved answers for this attempt
      const savedAnswers = await StudentAnswer.find({
        attemptId: attempt._id,
      }).populate("questionId", "text marks expectedAnswer type options");

      let totalScore = 0;
      let maxScore = 0;
      let anyScored = false;
      let anyQuestions = false;

      // 3) Evaluation (AI for descriptive, direct for MCQ)
      for (const ans of savedAnswers) {
        const q = ans.questionId;
        if (!q) continue;

        anyQuestions = true;

        const maxMarks = q.marks || 0;
        maxScore += maxMarks;

        let score, feedback;

        // MCQ evaluation
        if (q.type === "mcq") {
          // Find the correct option index
          const correctOptionIndex = q.options.findIndex(
            (opt) => opt.isCorrect === true
          );

          const { score: mcqScore, feedback: mcqFeedback } = evaluateMCQAnswer({
            selectedOptionIndex: ans.selectedOptionIndex,
            correctOptionIndex,
            maxMarks,
          });

          score = mcqScore;
          feedback = mcqFeedback;
        } else {
          // Descriptive evaluation using AI
          const { score: aiScore, feedback: aiFeedback } =
            await evaluateAnswerWithAI({
              questionText: q.text,
              expectedAnswer: q.expectedAnswer,
              studentAnswer: ans.answerText,
              maxMarks,
            });

          score = aiScore;
          feedback = aiFeedback;
        }

        if (score != null) {
          anyScored = true;
          totalScore += score;
        }

        ans.score = score;
        ans.maxMarks = maxMarks;
        ans.evaluationFeedback = feedback;
        ans.evaluationModel =
          q.type === "mcq"
            ? "direct"
            : process.env.AI_MODEL || "gemini-1.5-flash";
        ans.evaluatedAt = new Date();

        await ans.save();
      }

      // 4) Update attempt with overall result
      attempt.finishedAt = now;

      if (anyScored && maxScore > 0) {
        attempt.totalScore = totalScore;
        attempt.maxScore = maxScore;
        attempt.status = "evaluated"; // fully AI-graded
      } else if (anyQuestions) {
        attempt.status = "submitted"; // answers stored but not graded by AI
      } else {
        attempt.status = "submitted"; // no questions? still mark as submitted
      }

      await attempt.save();

      return res.status(200).json({
        message: "Answers submitted" + (anyScored ? " and evaluated" : ""),
        attempt: {
          id: attempt._id,
          status: attempt.status,
          totalScore: attempt.totalScore,
          maxScore: attempt.maxScore,
          startedAt: attempt.startedAt,
          finishedAt: attempt.finishedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

//
// ---------- 5) STUDENT EXAM HISTORY ----------
// GET /api/student/exams/history
//
router.get(
  "/exams/history",
  authMiddleware,
  requireRole("student"),
  async (req, res, next) => {
    try {
      const studentId = req.user.sub;

      const attempts = await StudentExamAttempt.find({
        studentId,
      })
        .sort({ startedAt: -1 })
        .populate("examId", "title examCode startTime endTime durationMinutes");

      const result = attempts.map((a) => ({
        attemptId: a._id,
        examId: a.examId?._id,
        title: a.examId?.title,
        examCode: a.examId?.examCode,
        startTime: a.examId?.startTime,
        endTime: a.examId?.endTime,
        durationMinutes: a.examId?.durationMinutes,
        status: a.status,
        startedAt: a.startedAt,
        finishedAt: a.finishedAt,
        totalScore: a.totalScore,
        maxScore: a.maxScore,
      }));

      return res.status(200).json({ attempts: result });
    } catch (error) {
      next(error);
    }
  }
);

//
// ---------- 6) OPTIONAL: TEST GEMINI EVAL (DEV ONLY) ----------
// GET /api/student/eval/test   (you can remove in production)
//
router.get("/eval/test", async (req, res, next) => {
  try {
    const result = await evaluateAnswerWithAI({
      questionText: "Explain polymorphism in OOP.",
      expectedAnswer:
        "Polymorphism allows methods with the same name to behave differently based on the actual object type, typically via method overriding.",
      studentAnswer:
        "Polymorphism is when the same function name behaves differently based on which object is calling it, usually via method overriding in subclasses.",
      maxMarks: 5,
    });

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});
// ---------- 7) STUDENT ATTEMPT RESULTS (DETAIL) ----------
// GET /api/student/attempts/:attemptId/results
// Returns exam info + all questions with student's answers, scores & feedback
router.get(
  "/attempts/:attemptId/results",
  authMiddleware,
  requireRole("student"),
  async (req, res, next) => {
    try {
      const { attemptId } = req.params;
      const studentId = req.user.sub;

      const attempt = await StudentExamAttempt.findById(attemptId).populate(
        "examId",
        "title examCode startTime endTime durationMinutes"
      );

      if (!attempt) {
        return res.status(404).json({ message: "Attempt not found" });
      }

      if (attempt.studentId.toString() !== studentId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const exam = attempt.examId;

      // Fetch all answers + question data
      const answers = await StudentAnswer.find({
        attemptId: attempt._id,
      }).populate("questionId", "text marks instruction order");

      const questions = answers.map((a) => {
        const q = a.questionId;
        return {
          questionId: q?._id,
          text: q?.text,
          marks: q?.marks,
          order: q?.order,
          instruction: q?.instruction,
          answerText: a.answerText,
          score: a.score,
          maxMarks: a.maxMarks,
          feedback: a.evaluationFeedback,
          evaluatedAt: a.evaluatedAt,
        };
      });

      return res.status(200).json({
        attempt: {
          id: attempt._id,
          status: attempt.status,
          totalScore: attempt.totalScore,
          maxScore: attempt.maxScore,
          startedAt: attempt.startedAt,
          finishedAt: attempt.finishedAt,
        },
        exam: {
          id: exam?._id,
          title: exam?.title,
          examCode: exam?.examCode,
          startTime: exam?.startTime,
          endTime: exam?.endTime,
          durationMinutes: exam?.durationMinutes,
        },
        questions,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
