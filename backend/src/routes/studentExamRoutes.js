// src/routes/studentExamRoutes.js
const express = require("express");
const Exam = require("../models/Exam");
const Question = require("../models/Question");
const StudentExamAttempt = require("../models/StudentExamAttempt");
const StudentAnswer = require("../models/StudentAnswer");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const { evaluateAnswerWithAI } = require("../services/evaluationService");

const router = express.Router();

// Map question to student-safe view (no expectedAnswer, no sensitive fields)
const mapQuestionForStudent = (q) => {
  return {
    id: q._id,
    text: q.text,
    type: q.type,
    marks: q.marks,
    instruction: q.instruction,
    media: q.media,
    order: q.order,
  };
};

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

      // Check if attempt already exists
      let attempt = await StudentExamAttempt.findOne({
        examId,
        studentId,
      });

      if (attempt) {
        if (attempt.status === "in_progress") {
          return res.status(200).json({
            message: "Exam already started",
            attempt,
          });
        }
        return res.status(400).json({
          message: "You have already attempted this exam",
          attempt,
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
        attempt,
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

      const questionMap = new Map(
        questions.map((q) => [q._id.toString(), q])
      );

      // 1) Save / upsert all answers first
      const bulkOps = [];

      for (const ans of answers) {
        const q = questionMap.get(String(ans.questionId));
        if (!q) continue; // ignore invalid question id

        bulkOps.push({
          updateOne: {
            filter: {
              attemptId: attempt._id,
              questionId: q._id,
              studentId,
              examId: exam._id,
            },
            update: {
              $set: {
                answerText: ans.answerText || "",
              },
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
      }).populate("questionId", "text marks expectedAnswer");

      let totalScore = 0;
      let maxScore = 0;
      let anyScored = false;
      let anyQuestions = false;

      // 3) AI evaluation using Gemini for each answer
      for (const ans of savedAnswers) {
        const q = ans.questionId;
        if (!q) continue;

        anyQuestions = true;

        const maxMarks = q.marks || 0;
        maxScore += maxMarks;

        const { score, feedback } = await evaluateAnswerWithAI({
          questionText: q.text,
          expectedAnswer: q.expectedAnswer,
          studentAnswer: ans.answerText,
          maxMarks,
        });

        if (score != null) {
          anyScored = true;
          totalScore += score;
        }

        ans.score = score;
        ans.maxMarks = maxMarks;
        ans.evaluationFeedback = feedback;
        ans.evaluationModel =
          process.env.AI_MODEL || "gemini-1.5-flash";
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
