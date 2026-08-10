// src/routes/examRoutes.js
const express = require("express");
const Exam = require("../models/Exam");
const Question = require("../models/Question");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const uploadJson = require("../middleware/uploadJson");
const StudentExamAttempt = require("../models/StudentExamAttempt");
const StudentAnswer = require("../models/StudentAnswer");
const aiQueue = require("../queues/aiQueue");
const {
  generateQuestionsWithAI,
} = require("../services/questionGenerationService");
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
    slotDurationMin: examObj.slotDurationMinutes,
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
        branches,
        semesters,
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

        branches: Array.isArray(branches) ? branches : [],
        semesters: Array.isArray(semesters) ? semesters : [],
      });

      return res.status(201).json({
        message: "Exam created (draft). Now add questions.",
        exam,
      });
    } catch (error) {
      next(error);
    }
  },
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
        }),
      );

      return res.status(200).json({ exams: transformedExams });
    } catch (error) {
      next(error);
    }
  },
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
        "name email username",
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
  },
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
        slotDurationMin,
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
      if (slotDurationMin != null) exam.slotDurationMinutes = slotDurationMin;

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
  },
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

      const allowedTypes = [
        "short_answer",
        "long_answer",
        "mcq",
        "viva",
        "interview",
      ];
      const finalType = allowedTypes.includes(type) ? type : "long_answer";

      // MCQ validation (unchanged)
      if (finalType === "mcq") {
        if (
          !Array.isArray(options) ||
          options.length < 2 ||
          options.length > 4
        ) {
          return res.status(400).json({
            message: "MCQ must have 2 to 4 options",
          });
        }

        const correctCount = options.filter((o) => o.isCorrect).length;
        if (correctCount !== 1) {
          return res.status(400).json({
            message: "MCQ must have exactly 1 correct option",
          });
        }

        if (!options.every((o) => o.text && o.text.trim())) {
          return res.status(400).json({
            message: "All MCQ options must have text",
          });
        }
      }

      const questionCount = await Question.countDocuments({ examId });

      const question = await Question.create({
        examId,
        teacherId,
        text,
        type: finalType,
        marks,
        expectedAnswer,
        instruction,
        options: finalType === "mcq" ? options : [],
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

        // ✅ ADDED: Audio required for ALL question types
        requiresAudio: true,
      });

      // ✅ ADDED: MCQ never needs rubric
      if (finalType === "mcq") {
        await Question.findByIdAndUpdate(question._id, {
          "aiStatus.rubric": "skipped",
        });
      }

      // 🔹 Trigger background AI processing (unchanged)
      aiQueue.add(
        "process-question",
        { questionId: question._id },
        {
          attempts: 5,
          backoff: { type: "exponential", delay: 5000 },
        },
      );

      return res.status(201).json({
        message: "Question added to exam",
        question,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ================= BULK IMPORT =================

router.post(
  "/:examId/questions/import",
  authMiddleware,
  requireRole("teacher"),
  uploadJson.single("file"),
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

      const json = JSON.parse(req.file.buffer.toString("utf8"));
      if (!Array.isArray(json.questions) || json.questions.length === 0) {
        return res.status(400).json({
          message: "JSON must contain non-empty 'questions' array",
        });
      }

      const existingCount = await Question.countDocuments({ examId });
      let orderCounter = existingCount + 1;

      const docsToInsert = [];

      for (let index = 0; index < json.questions.length; index++) {
        const q = json.questions[index];

        if (!q.text || q.marks == null) {
          return res.status(400).json({
            message: `Question at index ${index} missing text or marks`,
          });
        }

        const allowedTypes = [
          "short_answer",
          "long_answer",
          "mcq",
          "viva",
          "interview",
        ];
        const finalType = allowedTypes.includes(q.type)
          ? q.type
          : "long_answer";

        docsToInsert.push({
          examId,
          teacherId,
          text: q.text,
          type: finalType,
          marks: q.marks,
          expectedAnswer: q.expectedAnswer || "",
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

          // ✅ ADDED: Audio for all question types
          requiresAudio: true,
        });
      }

      const inserted = await Question.insertMany(docsToInsert);

      // ✅ ADDED: Mark MCQ rubric skipped
      for (const q of inserted) {
        if (q.type === "mcq") {
          await Question.findByIdAndUpdate(q._id, {
            "aiStatus.rubric": "skipped",
          });
        }

        aiQueue.add(
          "process-question",
          { questionId: q._id },
          {
            attempts: 5,
            backoff: { type: "exponential", delay: 5000 },
          },
        );
      }

      return res.status(201).json({
        message: "Questions imported successfully",
        importedCount: inserted.length,
        questions: inserted,
      });
    } catch (error) {
      next(error);
    }
  },
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
  },
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
  },
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
  },
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
      const { startTime, endTime, durationMinutes, slotDurationMinutes, status } = req.body;

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

      // Validate slotDurationMinutes
      if (!slotDurationMinutes || slotDurationMinutes <= 0) {
        return res.status(400).json({
          message: "slotDurationMinutes must be a positive number",
        });
      }

      const start = parseDate(startTime);
      const end = parseDate(endTime);

      if (!start || !end || start >= end) {
        return res.status(400).json({
          message: "Invalid startTime or endTime",
        });
      }

      // Calculate exam window in minutes
      const windowMinutes = Math.floor((end - start) / (1000 * 60));

      // Validate slot duration doesn't exceed exam window
      if (slotDurationMinutes > windowMinutes) {
        return res.status(400).json({
          message: `slotDurationMinutes (${slotDurationMinutes}) cannot exceed exam window (${windowMinutes} minutes)`,
        });
      }

      exam.startTime = start;
      exam.endTime = end;
      exam.durationMinutes = durationMinutes;
      exam.slotDurationMinutes = slotDurationMinutes;

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
  },
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

      // 1) Fetch exam questions
      const questions = await Question.find({ examId }).sort({ order: 1 });

      // 2) Get all attempts for this exam
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
            pointsTotal: exam.pointsTotal,
            resultsPublished: exam.resultsPublished === true,
            resultPublishedAt: exam.resultPublishedAt,
          },
          questions: questions.map((q) => ({
            _id: q._id,
            text: q.text,
            type: q.type,
            marks: q.marks,
            order: q.order,
            instruction: q.instruction,
            options: q.type === "mcq" ? q.options : undefined,
          })),
          attempts: [],
        });
      }

      const attemptIds = attempts.map((a) => a._id);

      // 3) Fetch all answers for these attempts, with question info
      const answers = await StudentAnswer.find({
        attemptId: { $in: attemptIds },
      }).populate("questionId", "text marks instruction order type options");

      // Group answers by attemptId
      const answersByAttempt = new Map();
      for (const ans of answers) {
        const key = ans.attemptId.toString();
        if (!answersByAttempt.has(key)) {
          answersByAttempt.set(key, []);
        }
        const q = ans.questionId;

        // Process and deduplicate recording URLs
        let recordings = [];
        if (Array.isArray(ans.recordingUrls) && ans.recordingUrls.length > 0) {
          recordings = ans.recordingUrls.filter(
            (url) => typeof url === "string" && url.trim().length > 0,
          );
        }

        // Fallback: If recordingUrls is empty, extract from answerText if it contains "[Audio recording: https://...]"
        if (recordings.length === 0 && ans.answerText) {
          const match = ans.answerText.match(
            /\[Audio recording:\s*(https?:\/\/[^\]\s]+)\]/i,
          );
          if (match && match[1]) {
            recordings.push(match[1].trim());
          }
        }

        // Deduplicate URLs strictly so we NEVER show duplicate takes for the same recording
        const uniqueRecordings = [...new Set(recordings)];

        answersByAttempt.get(key).push({
          _id: ans._id,
          questionId: q?._id,
          text: q?.text,
          type: q?.type,
          marks: q?.marks,
          order: q?.order,
          instruction: q?.instruction,
          options: q?.type === "mcq" ? q?.options : undefined,
          answerText: ans.answerText,
          transcribedText: ans.transcribedText,
          recordingUrls: uniqueRecordings,
          selectedOptionIndex: ans.selectedOptionIndex,
          score: ans.score,
          maxMarks: ans.maxMarks,
          feedback: ans.evaluationFeedback,
          evaluatedAt: ans.evaluatedAt,
          sttStatus: ans.sttStatus,
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
          pointsTotal: exam.pointsTotal,
          resultsPublished: exam.resultsPublished === true,
          resultPublishedAt: exam.resultPublishedAt,
        },
        questions: questions.map((q) => ({
          _id: q._id,
          text: q.text,
          type: q.type,
          marks: q.marks,
          order: q.order,
          instruction: q.instruction,
          options: q.type === "mcq" ? q.options : undefined,
        })),
        attempts: resultAttempts,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/exams/questions_generate/generate
 * Generate exam questions using AI Model API
 * Requires authentication and teacher role
 *
 * Sample Request:
 * {
 *   "topics": ["Algorithm", "Networking"],
 *   "num_questions": 5,
 *   "difficulty": "hard"
 * }
 *
 * Sample Response:
 * {
 *   "topics": {
 *     "Algorithm": {
 *       "question 1": "...",
 *       "question 2": "..."
 *     },
 *     "Networking": {
 *       "question 1": "...",
 *       "question 2": "..."
 *     }
 *   }
 * }
 */
router.post(
  "/questions_generate/generate",
  authMiddleware,
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      console.log(
        "\n========== QUESTION GENERATION ENDPOINT CALLED ==========",
      );
      console.log(`📥 Raw Request Body:`, req.body);
      console.log(`🔐 Teacher ID: ${req.user.sub}`);

      const { topics, num_questions, difficulty, type } = req.body;
      console.log(`✔️ Destructured - Topics:`, topics);
      console.log(`✔️ Destructured - Num Questions:`, num_questions);
      console.log(`✔️ Destructured - Difficulty:`, difficulty);
      console.log(`✔️ Destructured - Type:`, type);

      // Validate request data
      if (!topics || !Array.isArray(topics) || topics.length === 0) {
        console.warn("⚠️ Validation failed: topics must be a non-empty array");
        return res.status(400).json({
          message: "Invalid request: 'topics' must be a non-empty array",
        });
      }

      if (
        !num_questions ||
        typeof num_questions !== "number" ||
        num_questions < 1
      ) {
        console.warn(
          "⚠️ Validation failed: num_questions must be a positive number",
        );
        return res.status(400).json({
          message: "Invalid request: 'num_questions' must be a positive number",
        });
      }

      if (!difficulty || typeof difficulty !== "string") {
        console.warn("⚠️ Validation failed: difficulty must be a string");
        return res.status(400).json({
          message: "Invalid request: 'difficulty' must be a string",
        });
      }

      if (type && typeof type !== "string") {
        console.warn("⚠️ Validation failed: type must be a string");
        return res.status(400).json({
          message: "Invalid request: 'type' must be a string",
        });
      }

      console.log("\n✅ All validations passed");
      console.log(
        `🎓 Question Generation Request from Teacher: ${req.user.sub}`,
      );
      console.log(`📝 Topics: ${topics.join(", ")}`);
      console.log(`📊 Number of Questions: ${num_questions}`);
      console.log(`🎯 Difficulty: ${difficulty}`);
      console.log(`🏷️ Type: ${type || 'viva'}`);

      // Prepare request payload
      const requestPayload = {
        topics,
        num_questions,
        difficulty,
        type: type || 'viva',
      };
      console.log(
        "\n📤 Calling AI Model API with payload:",
        JSON.stringify(requestPayload, null, 2),
      );

      // Call AI Model API with the request data
      const startTime = Date.now();
      const result = await generateQuestionsWithAI(requestPayload);
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`⏱️ AI Model API call took: ${duration}ms`);
      console.log(`📊 Result object:`, {
        success: result.success,
        hasError: !!result.error,
        statusCode: result.statusCode,
      });

      // Handle AI Model API errors
      if (!result.success) {
        console.error("❌ AI Model API Error Details:");
        console.error(`   - Error Message: ${result.error}`);
        console.error(`   - Status Code: ${result.statusCode || 500}`);
        return res.status(result.statusCode || 500).json({
          message: "Failed to generate questions",
          error: result.error,
        });
      }

      console.log("✅ Questions generated successfully");
      console.log(`📝 Response data structure:`, {
        type: typeof result.data,
        keys: result.data ? Object.keys(result.data) : null,
        topicCount: result.data?.topics
          ? Object.keys(result.data.topics).length
          : null,
      });
      console.log(
        `📄 Full response preview:`,
        JSON.stringify(result.data, null, 2).substring(0, 500),
      );

      // Return the AI model response directly to the frontend
      console.log("✔️ Sending response to frontend");
      return res.status(200).json(result.data);
    } catch (error) {
      console.error("\n EXCEPTION in question generation endpoint:");
      console.error(`   - Error Message: ${error.message}`);
      console.error(`   - Error Stack:`, error.stack);
      console.error(`   - Full Error:`, error);
      next(error);
    }
  },
);

/**
 * PUT /api/student-answers/:answerId/score
 * Update score and feedback for a student answer (teacher grading)
 */
router.put(
  "/student-answers/:answerId/score",
  authMiddleware,
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const { answerId } = req.params;
      const { score, feedback } = req.body;
      const teacherId = req.user.sub;

      // Validate score if provided
      if (score != null && (typeof score !== "number" || score < 0)) {
        return res.status(400).json({
          message: "score must be a non-negative number",
        });
      }

      // Find the answer
      const answer = await StudentAnswer.findById(answerId);
      if (!answer) {
        return res.status(404).json({ message: "Answer not found" });
      }

      // Verify exam belongs to this teacher
      const exam = await Exam.findById(answer.examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }

      if (exam.teacherId.toString() !== teacherId) {
        return res.status(403).json({
          message: "Forbidden: You cannot modify scores for this exam",
        });
      }

      // Validate score doesn't exceed max marks
      if (score != null && score > answer.maxMarks) {
        return res.status(400).json({
          message: `score cannot exceed maxMarks (${answer.maxMarks})`,
        });
      }

      // Unpublish results on manual edit so teacher can review before republishing
      exam.resultsPublished = false;
      exam.resultPublishedAt = null;
      await exam.save();

      // Build update payload
      const updateData = {
        evaluatedAt: new Date(),
        evaluationStatus: "completed",
      };

      if (score != null) {
        updateData.score = score;
      }

      if (feedback !== undefined) {
        updateData.evaluationFeedback = typeof feedback === "string" ? feedback.trim() : "";
      }

      // Update the answer
      const updatedAnswer = await StudentAnswer.findByIdAndUpdate(
        answerId,
        updateData,
        { new: true },
      );

      console.log(
        `✅ Score & feedback updated for answer ${answerId}: ${updatedAnswer.score}/${answer.maxMarks}`,
      );

      // Recalculate total score for the attempt
      const allAnswers = await StudentAnswer.find({
        attemptId: answer.attemptId,
      });
      const totalScore = allAnswers.reduce(
        (sum, ans) => sum + (ans.score || 0),
        0,
      );

      // Update the attempt with new total score
      const attempt = await StudentExamAttempt.findByIdAndUpdate(
        answer.attemptId,
        { totalScore, status: "evaluated" },
        { new: true },
      );

      console.log(`✅ Attempt total score recalculated: ${totalScore}`);

      return res.status(200).json({
        message: "Score and feedback updated successfully",
        answer: updatedAnswer,
        attempt: {
          attemptId: attempt._id,
          totalScore: attempt.totalScore,
          maxScore: attempt.maxScore,
        },
        resultsPublished: false,
      });
    } catch (error) {
      console.error("Error updating answer score and feedback:", error);
      next(error);
    }
  },
);

// GET /api/exams/:examId/attempts
router.get(
  "/:examId/attempts",
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
        return res.status(403).json({ message: "Forbidden" });
      }

      const attempts = await StudentExamAttempt.find({ examId })
        .populate("studentId", "username email")
        .sort({ startedAt: -1 });

      return res.status(200).json({ attempts });
    } catch (error) {
      next(error);
    }
  }
);


// PATCH /api/exams/:examId/reallow/:studentId
router.patch(
  "/:examId/reallow/:studentId",
  authMiddleware,
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const { examId, studentId } = req.params;

      const exam = await Exam.findById(examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }

      if (exam.teacherId.toString() !== req.user.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Commented out the old query which did not sort by startedAt (could pick an older attempt if multiple existed)
      // const attempt = await StudentExamAttempt.findOne({
      //   examId,
      //   studentId,
      // });
      // NEW: Find the latest attempt by sorting by startedAt descending
      const attempt = await StudentExamAttempt.findOne({
        examId,
        studentId,
      }).sort({ startedAt: -1 });

      if (!attempt) {
        return res.status(404).json({
          message: "Attempt not found for this student",
        });
      }

      // 🔥 MAIN LOGIC
      attempt.status = "reallowed";
      await attempt.save();

      return res.status(200).json({
        message: "Student reallowed successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/exams/:examId/questions/:questionId/bonus-marks
 * Award fixed marks / bonus override for a question across all student submissions
 * Also sets exam.resultsPublished = false so faculty can review before republishing.
 */
router.post(
  "/:examId/questions/:questionId/bonus-marks",
  authMiddleware,
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const { examId, questionId } = req.params;
      const { score, reason, applyToSkipped = true } = req.body;
      const teacherId = req.user.sub;

      // 1. Validate score
      if (score == null || typeof score !== "number" || score < 0) {
        return res.status(400).json({
          message: "Score must be a non-negative number",
        });
      }

      // 2. Validate exam & ownership
      const exam = await Exam.findById(examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      if (exam.teacherId.toString() !== teacherId) {
        return res.status(403).json({
          message: "Forbidden: You cannot modify scores for this exam",
        });
      }

      // 3. Validate question
      const question = await Question.findOne({ _id: questionId, examId });
      if (!question) {
        return res.status(404).json({
          message: "Question not found in this exam",
        });
      }

      if (score > question.marks) {
        return res.status(400).json({
          message: `Score (${score}) cannot exceed question max marks (${question.marks})`,
        });
      }

      // 4. Set resultsPublished as false so faculty can review & republish
      exam.resultsPublished = false;
      exam.resultPublishedAt = null;
      await exam.save();

      console.log(`[Bonus Marks] Set exam ${examId} resultsPublished to false`);

      // 5. Find all attempts for this exam
      const attempts = await StudentExamAttempt.find({
        examId,
        status: { $in: ["submitted", "transcribed", "evaluated"] },
      });

      if (attempts.length === 0) {
        return res.status(200).json({
          message: "No student submissions to update",
          updatedCount: 0,
          resultsPublished: false,
        });
      }

      const feedbackNote = reason && reason.trim() ? reason.trim() : "";

      // 6. Bulk update/upsert StudentAnswer records
      const answerBulkOps = attempts.map((att) => ({
        updateOne: {
          filter: {
            attemptId: att._id,
            questionId: question._id,
          },
          update: {
            $set: {
              examId: exam._id,
              studentId: att.studentId,
              score: score,
              maxMarks: question.marks,
              evaluationFeedback: feedbackNote,
              evaluationStatus: "completed",
              evaluatedAt: new Date(),
            },
          },
          upsert: applyToSkipped === true,
        },
      }));

      await StudentAnswer.bulkWrite(answerBulkOps);

      // 7. Recalculate totalScore for each student attempt
      const attemptIds = attempts.map((a) => a._id);
      const allAnswers = await StudentAnswer.find({
        attemptId: { $in: attemptIds },
      });

      const scoresByAttempt = {};
      for (const ans of allAnswers) {
        const attId = ans.attemptId.toString();
        scoresByAttempt[attId] =
          (scoresByAttempt[attId] || 0) + (ans.score || 0);
      }

      const attemptBulkOps = attemptIds.map((attId) => ({
        updateOne: {
          filter: { _id: attId },
          update: {
            $set: {
              totalScore: scoresByAttempt[attId.toString()] || 0,
              status: "evaluated",
            },
          },
        },
      }));

      await StudentExamAttempt.bulkWrite(attemptBulkOps);

      console.log(
        `✅ Bonus marks (${score}/${question.marks}) applied to ${attempts.length} attempts for Question ${questionId}`
      );

      return res.status(200).json({
        message: `Successfully awarded ${score}/${question.marks} marks to ${attempts.length} student submission(s).`,
        updatedCount: attempts.length,
        questionId: question._id,
        awardedScore: score,
        maxMarks: question.marks,
        reason: reason || null,
        resultsPublished: false,
      });
    } catch (error) {
      console.error("Error awarding bonus marks:", error);
      next(error);
    }
  }
);

module.exports = router;
