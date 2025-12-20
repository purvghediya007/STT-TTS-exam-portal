// src/routes/examRoutes.js
const express = require("express");
const Exam = require("../models/Exam");
const Question = require("../models/Question");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const uploadJson = require("../middleware/uploadJson");
const StudentExamAttempt = require("../models/StudentExamAttempt");
const StudentAnswer = require("../models/StudentAnswer");

const router = express.Router();

// Helper to parse optional ISO date strings safely
const parseDate = (value) => {
  if (!value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
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
    timePerQuestionSec: examObj.timePerQuestion,
    pointsTotal: examObj.pointsTotal,
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
// ---------- EXAM BASIC CREATION (TEACHER) ----------
//

// POST /api/exams
// Step 1: Teacher creates exam with title + basic fields (no time yet)
router.post(
  "/",
  authMiddleware,
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const {
        title,
        description,
        shortDescription,
        instructions,
        examCode,
        settings,
        pointsTotal,
        timePerQuestion,
        attemptsAllowed,
        strictMode,
        allowedReRecords,
        marks,
        startsAt,
        endsAt,
        durationMin,
      } = req.body;

      if (!title || !examCode) {
        return res.status(400).json({
          message: "title and examCode are required",
        });
      }

      const normalizedExamCode = String(examCode).toUpperCase().trim();

      // Check unique examCode
      const existing = await Exam.findOne({ examCode: normalizedExamCode });
      if (existing) {
        return res
          .status(409)
          .json({ message: "examCode already exists. Use a different code." });
      }

      const exam = await Exam.create({
        title,
        description,
        shortDescription,
        instructions,
        examCode: normalizedExamCode,
        teacherId: req.user.sub,
        pointsTotal: pointsTotal ?? 100,
        timePerQuestion,
        attemptsAllowed: attemptsAllowed ?? 1,
        strictMode: strictMode ?? false,
        allowedReRecords: allowedReRecords ?? 1,
        startTime: startsAt ? new Date(startsAt) : undefined,
        endTime: endsAt ? new Date(endsAt) : undefined,
        durationMinutes: durationMin,
        marks: marks || {
          mcq: 0,
          viva: 0,
          interview: 0,
          total: pointsTotal ?? 100,
        },
        settings: {
          thinkTimeSeconds: settings?.thinkTimeSeconds ?? 10,
          answerTimeSeconds: settings?.answerTimeSeconds ?? 60,
          reRecordAllowed: settings?.reRecordAllowed ?? 1,
          ttsVoice: settings?.ttsVoice ?? "en_us_female",
        },
      });

      return res.status(201).json({
        message: "Exam created (draft). Now add questions.",
        exam,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/exams/my
// List exams created by logged-in teacher
router.get(
  "/my",
  authMiddleware,
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const exams = await Exam.find({ teacherId: req.user.sub })
        .populate("teacherId", "name email username")
        .sort({
          createdAt: -1,
        });

      // Get submission counts for each exam
      const transformedExams = await Promise.all(
        exams.map(async (exam) => {
          const submissionCount = await StudentExamAttempt.countDocuments({
            examId: exam._id,
          });
          const transformed = transformExamForFrontend(exam.toObject());
          return {
            ...transformed,
            submissionCount: submissionCount,
          };
        })
      );

      return res.status(200).json({ exams: transformedExams });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/exams/:id
// Get single exam (only owner teacher for now)
router.get(
  "/:id",
  authMiddleware,
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const exam = await Exam.findById(req.params.id).populate(
        "teacherId",
        "name email username"
      );

      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }

      if (exam.teacherId._id.toString() !== req.user.sub) {
        return res.status(403).json({ message: "Forbidden: not your exam" });
      }

      // Transform for frontend compatibility
      const transformedExam = transformExamForFrontend(exam.toObject());

      return res.status(200).json({ exam: transformedExam });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/exams/:id
// Update exam details
router.put(
  "/:id",
  authMiddleware,
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const exam = await Exam.findById(req.params.id);

      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }

      if (exam.teacherId.toString() !== req.user.sub) {
        return res.status(403).json({ message: "Forbidden: not your exam" });
      }

      const {
        title,
        description,
        shortDescription,
        instructions,
        pointsTotal,
        timePerQuestion,
        attemptsAllowed,
        strictMode,
        allowedReRecords,
        marks,
        startsAt,
        endsAt,
        durationMin,
      } = req.body;

      // Update fields
      if (title != null) exam.title = title;
      if (description != null) exam.description = description;
      if (shortDescription != null) exam.shortDescription = shortDescription;
      if (instructions != null) exam.instructions = instructions;
      if (pointsTotal != null) exam.pointsTotal = pointsTotal;
      if (timePerQuestion != null) exam.timePerQuestion = timePerQuestion;
      if (attemptsAllowed != null) exam.attemptsAllowed = attemptsAllowed;
      if (strictMode != null) exam.strictMode = strictMode;
      if (allowedReRecords != null) exam.allowedReRecords = allowedReRecords;
      if (marks != null) exam.marks = marks;
      if (startsAt != null) exam.startTime = new Date(startsAt);
      if (endsAt != null) exam.endTime = new Date(endsAt);
      if (durationMin != null) exam.durationMinutes = durationMin;

      await exam.save();

      // Transform for frontend compatibility
      const transformedExam = transformExamForFrontend(exam.toObject());

      return res.status(200).json({
        message: "Exam updated successfully",
        exam: transformedExam,
      });
    } catch (error) {
      next(error);
    }
  }
);

//
// ---------- QUESTION CREATION / MANAGEMENT (VIVA ONLY) ----------
//

// METHOD 1: Manual single-question creation
// POST /api/exams/:examId/questions
router.post(
  "/:examId/questions",
  authMiddleware,
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const { examId } = req.params;
      const teacherId = req.user.sub;

      const exam = await Exam.findById(examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      if (exam.teacherId.toString() !== teacherId) {
        return res.status(403).json({ message: "Forbidden: not your exam" });
      }

      const {
        text,
        marks,
        expectedAnswer,
        instruction,
        media,
        perQuestionSettings,
        order,
        type,
        options,
      } = req.body;

      if (!text || marks == null) {
        return res.status(400).json({
          message: "text and marks are required for a question",
        });
      }

      // Validate type and allow MCQ, viva, interview
      const allowedTypes = [
        "short_answer",
        "long_answer",
        "mcq",
        "viva",
        "interview",
      ];
      const finalType = allowedTypes.includes(type) ? type : "long_answer";

      // MCQ specific validation
      if (finalType === "mcq") {
        if (!Array.isArray(options) || options.length === 0) {
          return res.status(400).json({
            message: "MCQ requires options array",
          });
        }

        if (options.length < 2) {
          return res.status(400).json({
            message: "MCQ must have minimum 2 options",
          });
        }

        if (options.length > 4) {
          return res.status(400).json({
            message: "MCQ can have maximum 4 options",
          });
        }

        // Check if exactly one option is marked as correct
        const correctCount = options.filter((opt) => opt.isCorrect).length;
        if (correctCount !== 1) {
          return res.status(400).json({
            message: "MCQ must have exactly 1 correct option",
          });
        }

        // Validate all options have text
        if (!options.every((opt) => opt.text && opt.text.trim())) {
          return res.status(400).json({
            message: "All MCQ options must have text",
          });
        }
      } else if (finalType !== "mcq") {
        // For non-MCQ questions, options should be ignored
        // Continue with normal flow
      }

      const questionCount = await Question.countDocuments({ examId });

      const question = await Question.create({
        examId,
        teacherId,
        text,
        type: finalType,
        marks,
        expectedAnswer, // optional
        instruction,
        options: finalType === "mcq" ? options : [], // Only include options for MCQ
        media: {
          imageUrl: media?.imageUrl,
          fileUrl: media?.fileUrl,
        },
        order: order != null ? order : questionCount + 1,
        perQuestionSettings: {
          thinkTimeSeconds: perQuestionSettings?.thinkTimeSeconds,
          answerTimeSeconds: perQuestionSettings?.answerTimeSeconds,
          reRecordAllowed: perQuestionSettings?.reRecordAllowed,
        },
      });

      return res.status(201).json({
        message: "Question added to exam",
        question,
      });
    } catch (error) {
      next(error);
    }
  }
);

// METHOD 2: Bulk import from JSON file
// POST /api/exams/:examId/questions/import
// multipart/form-data with field: file (JSON)
router.post(
  "/:examId/questions/import",
  authMiddleware,
  requireRole("teacher"),
  uploadJson.single("file"), // 👈 expects "file" field
  async (req, res, next) => {
    try {
      const { examId } = req.params;
      const teacherId = req.user.sub;

      const exam = await Exam.findById(examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      if (exam.teacherId.toString() !== teacherId) {
        return res.status(403).json({ message: "Forbidden: not your exam" });
      }

      if (!req.file) {
        return res.status(400).json({
          message: "JSON file is required in 'file' field",
        });
      }

      let json;
      try {
        const text = req.file.buffer.toString("utf8");
        json = JSON.parse(text);
      } catch (err) {
        return res.status(400).json({
          message: "Invalid JSON file format",
        });
      }

      if (!json.questions || !Array.isArray(json.questions)) {
        return res.status(400).json({
          message: "JSON must contain a 'questions' array",
        });
      }

      if (json.questions.length === 0) {
        return res.status(400).json({
          message: "'questions' array cannot be empty",
        });
      }

      const existingCount = await Question.countDocuments({ examId });
      let orderCounter = existingCount + 1;

      const docsToInsert = [];

      for (let index = 0; index < json.questions.length; index++) {
        const q = json.questions[index];

        if (!q.text || q.marks == null) {
          return res.status(400).json({
            message: `Question at index ${index} is missing required fields 'text' or 'marks'`,
          });
        }

        // optional type: default to long_answer
        const allowedTypes = [
          "short_answer",
          "long_answer",
          "mcq",
          "viva",
          "interview",
        ];
        let finalType = "long_answer";
        if (q.type && allowedTypes.includes(q.type)) {
          finalType = q.type;
        }

        docsToInsert.push({
          examId,
          teacherId,
          text: q.text,
          type: finalType,
          marks: q.marks,
          expectedAnswer: q.expectedAnswer || "", // optional; AI will infer if empty
          instruction: q.instruction || "",
          media: {
            imageUrl: q.media?.imageUrl || "",
            fileUrl: q.media?.fileUrl || "",
          },
          order: orderCounter++,
          perQuestionSettings: {
            thinkTimeSeconds: q.perQuestionSettings?.thinkTimeSeconds,
            answerTimeSeconds: q.perQuestionSettings?.answerTimeSeconds,
            reRecordAllowed: q.perQuestionSettings?.reRecordAllowed,
          },
        });
      }

      const inserted = await Question.insertMany(docsToInsert);

      return res.status(201).json({
        message: "Questions imported successfully",
        importedCount: inserted.length,
        questions: inserted,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/exams/:examId/questions
// Get all questions for an exam (for teacher to review)
router.get(
  "/:examId/questions",
  authMiddleware,
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const { examId } = req.params;

      const exam = await Exam.findById(examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      if (exam.teacherId.toString() !== req.user.sub) {
        return res.status(403).json({ message: "Forbidden: not your exam" });
      }

      const questions = await Question.find({ examId }).sort({ order: 1 });

      return res.status(200).json({ questions });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/exams/:examId/questions/:questionId
// Update a descriptive question
router.put(
  "/:examId/questions/:questionId",
  authMiddleware,
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const { examId, questionId } = req.params;
      const teacherId = req.user.sub;

      const exam = await Exam.findById(examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      if (exam.teacherId.toString() !== teacherId) {
        return res.status(403).json({ message: "Forbidden: not your exam" });
      }

      const question = await Question.findOne({
        _id: questionId,
        examId,
        teacherId,
      });

      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      const {
        text,
        marks,
        expectedAnswer,
        instruction,
        media,
        perQuestionSettings,
        order,
        type,
      } = req.body;

      if (text != null) question.text = text;
      if (marks != null) question.marks = marks;
      if (expectedAnswer != null) question.expectedAnswer = expectedAnswer;
      if (instruction != null) question.instruction = instruction;

      if (media) {
        if (media.imageUrl != null) question.media.imageUrl = media.imageUrl;
        if (media.fileUrl != null) question.media.fileUrl = media.fileUrl;
      }

      if (perQuestionSettings) {
        question.perQuestionSettings = {
          ...question.perQuestionSettings,
          ...perQuestionSettings,
        };
      }

      if (order != null) question.order = order;

      if (type != null) {
        const allowedTypes = [
          "short_answer",
          "long_answer",
          "mcq",
          "viva",
          "interview",
        ];
        if (allowedTypes.includes(type)) {
          question.type = type;
        }
      }

      await question.save();

      return res.status(200).json({
        message: "Question updated",
        question,
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/exams/:examId/questions/:questionId
router.delete(
  "/:examId/questions/:questionId",
  authMiddleware,
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const { examId, questionId } = req.params;
      const teacherId = req.user.sub;

      const exam = await Exam.findById(examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      if (exam.teacherId.toString() !== teacherId) {
        return res.status(403).json({ message: "Forbidden: not your exam" });
      }

      const deleted = await Question.findOneAndDelete({
        _id: questionId,
        examId,
        teacherId,
      });

      if (!deleted) {
        return res.status(404).json({ message: "Question not found" });
      }

      return res.status(200).json({ message: "Question deleted" });
    } catch (error) {
      next(error);
    }
  }
);

//
// ---------- SCHEDULING & LAUNCHING EXAM ----------
//

// PATCH /api/exams/:id/schedule
router.patch(
  "/:id/schedule",
  authMiddleware,
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { startTime, endTime, durationMinutes, status } = req.body;

      const exam = await Exam.findById(id);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }

      if (exam.teacherId.toString() !== req.user.sub) {
        return res.status(403).json({ message: "Forbidden: not your exam" });
      }

      if (!durationMinutes || durationMinutes <= 0) {
        return res.status(400).json({
          message: "durationMinutes must be a positive number",
        });
      }

      const start = parseDate(startTime);
      const end = parseDate(endTime);

      if (!start || !end || start >= end) {
        return res.status(400).json({
          message: "Invalid startTime or endTime",
        });
      }

      exam.startTime = start;
      exam.endTime = end;
      exam.durationMinutes = durationMinutes;

      if (status) {
        if (!["draft", "published", "archived"].includes(status)) {
          return res.status(400).json({
            message: "Invalid status. Allowed: draft, published, archived",
          });
        }
        exam.status = status;
      } else {
        exam.status = "published";
      }

      await exam.save();

      return res.status(200).json({
        message: "Exam schedule set and status updated",
        exam,
      });
    } catch (error) {
      next(error);
    }
  }
);
// ---------- TEACHER: EXAM RESULTS (ALL STUDENTS) ----------
// GET /api/exams/:examId/results
// Teacher sees all attempts + per-question scores & feedback
router.get(
  "/:examId/results",
  authMiddleware,
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const { examId } = req.params;
      const teacherId = req.user.sub;

      const exam = await Exam.findById(examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }

      if (exam.teacherId.toString() !== teacherId) {
        return res.status(403).json({ message: "Forbidden: not your exam" });
      }

      // 1) Get all attempts for this exam
      const attempts = await StudentExamAttempt.find({ examId })
        .sort({ startedAt: 1 })
        .populate("studentId", "username email");

      if (attempts.length === 0) {
        return res.status(200).json({
          exam: {
            id: exam._id,
            title: exam.title,
            examCode: exam.examCode,
            startTime: exam.startTime,
            endTime: exam.endTime,
            durationMinutes: exam.durationMinutes,
          },
          attempts: [],
        });
      }

      const attemptIds = attempts.map((a) => a._id);

      // 2) Fetch all answers for these attempts, with question info
      const answers = await StudentAnswer.find({
        attemptId: { $in: attemptIds },
      }).populate("questionId", "text marks instruction order");

      // Group answers by attemptId
      const answersByAttempt = new Map();
      for (const ans of answers) {
        const key = ans.attemptId.toString();
        if (!answersByAttempt.has(key)) {
          answersByAttempt.set(key, []);
        }
        const q = ans.questionId;
        answersByAttempt.get(key).push({
          questionId: q?._id,
          text: q?.text,
          marks: q?.marks,
          order: q?.order,
          instruction: q?.instruction,
          answerText: ans.answerText,
          score: ans.score,
          maxMarks: ans.maxMarks,
          feedback: ans.evaluationFeedback,
          evaluatedAt: ans.evaluatedAt,
        });
      }

      const resultAttempts = attempts.map((a) => {
        const student = a.studentId;
        const answersForAttempt = answersByAttempt.get(a._id.toString()) || [];

        return {
          attemptId: a._id,
          student: student
            ? {
                id: student._id,
                username: student.username,
                email: student.email,
              }
            : null,
          status: a.status,
          startedAt: a.startedAt,
          finishedAt: a.finishedAt,
          totalScore: a.totalScore,
          maxScore: a.maxScore,
          answers: answersForAttempt,
        };
      });

      return res.status(200).json({
        exam: {
          id: exam._id,
          title: exam.title,
          examCode: exam.examCode,
          startTime: exam.startTime,
          endTime: exam.endTime,
          durationMinutes: exam.durationMinutes,
        },
        attempts: resultAttempts,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
