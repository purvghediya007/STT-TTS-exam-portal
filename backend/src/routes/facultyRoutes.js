// src/routes/facultyRoutes.js
const express = require("express");
const Exam = require("../models/Exam");
const Question = require("../models/Question");
const Student = require("../models/Student");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
// const StudentExamAttempt = require("../models/StudentExamAttempt");
const StudentExamAttempt = require("../models/StudentExamAttempt");
const StudentAnswer = require("../models/StudentAnswer");
const aiQueue = require("../queues/aiQueue");
// const answersTranscriptionQueue = require("../queues/answersTranscriptionQueue");
const answersTranscriptionQueue = require("../queues/answersTranscriptionQueue");
const answersEvaluationQueue = require("../queues/answersEvaluationQueue");

const router = express.Router();

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
    shortDescription: examObj.shortDescription || examObj.description,
    instructions: examObj.instructions,
    marks: examObj.marks,
    branches: examObj.branches || [],
    semesters: examObj.semesters || [],
    questions: examObj.questions || [],
    teacherName: examObj.teacherId?.username || examObj.teacherId?.name || "Unknown Teacher",
  };
}

/**
 * GET /api/faculty/stats
 * Get faculty dashboard statistics
 */
router.get(
  "/stats",
  authMiddleware,
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const teacherId = req.user.sub;

      // Get all exams for this teacher
      const exams = await Exam.find({ teacherId });

      // Get all attempts for this teacher's exams
      const examIds = exams.map((e) => e._id);
      const attempts = await StudentExamAttempt.find({
        examId: { $in: examIds },
      }).countDocuments();

      const now = new Date();
      const activeExams = exams.filter((e) => {
        const starts = e.startTime ? new Date(e.startTime) : null;
        const ends = e.endTime ? new Date(e.endTime) : null;
        return starts && ends && now >= starts && now < ends;
      }).length;

      const upcomingExams = exams.filter((e) => {
        const starts = e.startTime ? new Date(e.startTime) : null;
        return starts && now < starts;
      }).length;

      const completedExams = exams.filter((e) => {
        const ends = e.endTime ? new Date(e.endTime) : null;
        return ends && now >= ends;
      }).length;

      // Get unique students who attempted any exam
      const uniqueStudents = await StudentExamAttempt.distinct("studentId", {
        examId: { $in: examIds },
      });

      return res.status(200).json({
        totalExams: exams.length,
        activeExams,
        upcomingExams,
        completedExams,
        totalStudents: uniqueStudents.length,
        avgSubmissions:
          exams.length > 0 ? Math.round(attempts / exams.length) : 0,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/faculty/exams
 * Create a new exam with all details
 */
router.post(
  "/exams",
  authMiddleware,
  requireRole("teacher"),
  async (req, res, next) => {
    try {
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

      const teacherId = req.user.sub;

      if (!title) {
        return res.status(400).json({ message: "title is required" });
      }

      // Generate unique exam code
      const examCode = `EXAM-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)
        .toUpperCase()}`;

      const exam = await Exam.create({
        title,
        description,
        shortDescription,
        instructions,
        examCode,
        teacherId,
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
        status: "draft",
        settings: {
          thinkTimeSeconds: 10,
          answerTimeSeconds: 60,
          reRecordAllowed: 1,
          ttsVoice: "en_us_female",
        },
      });

      await exam.populate("teacherId", "name email username");

      return res.status(201).json(transformExamForFrontend(exam.toObject()));
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PUT /api/faculty/exams/:id
 * Update an exam with all details
 */
router.put(
  "/exams/:id",
  authMiddleware,
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const teacherId = req.user.sub;

      const exam = await Exam.findById(id);

      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }

      if (exam.teacherId.toString() !== teacherId) {
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
      await exam.populate("teacherId", "name email username");

      return res.status(200).json(transformExamForFrontend(exam.toObject()));
    } catch (error) {
      next(error);
    }
  },
);

/**
 * DELETE /api/faculty/exams/:id
 * Delete an exam and its associated questions, attempts, and answers
 */
router.delete(
  "/exams/:id",
  authMiddleware,
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const teacherId = req.user.sub;

      const exam = await Exam.findById(id);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }

      if (exam.teacherId.toString() !== teacherId) {
        return res.status(403).json({ message: "Forbidden: not your exam" });
      }

      // Remove related data so the exam is fully deleted from the backend
      await Question.deleteMany({ examId: id });
      await StudentAnswer.deleteMany({ examId: id });
      await StudentExamAttempt.deleteMany({ examId: id });
      await Exam.findByIdAndDelete(id);

      return res.status(200).json({ message: "Exam deleted successfully" });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/faculty/exams/drafts
 * Get draft exams for the logged-in teacher
 */
router.get(
  "/exams/drafts",
  authMiddleware,
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const teacherId = req.user.sub;

      // In this system, drafts are exams with status "draft"
      const drafts = await Exam.find({
        teacherId,
        status: "draft",
      }).sort({ createdAt: -1 });

      // Transform for frontend compatibility and ensure questions are populated
      const transformedDrafts = await Promise.all(
        drafts.map(async (draft) => {
          const draftObj = draft.toObject();
          if (!draftObj.questions || draftObj.questions.length === 0) {
            const dbQuestions = await Question.find({ examId: draft._id }).sort({ order: 1 });
            if (dbQuestions && dbQuestions.length > 0) {
              draftObj.questions = dbQuestions.map((q) => ({
                id: q._id,
                text: q.text,
                question: q.text,
                type: q.type,
                marks: q.marks,
                options: q.options,
                expectedAnswer: q.expectedAnswer,
                instruction: q.instruction,
                media: q.media,
                perQuestionSettings: q.perQuestionSettings,
              }));
            }
          }
          return transformExamForFrontend(draftObj);
        })
      );

      return res.status(200).json(transformedDrafts);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/faculty/exams/drafts
 * Create a new draft exam
 */
router.post(
  "/exams/drafts",
  authMiddleware,
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const {
        title,
        shortDescription,
        instructions,
        branches,
        semesters,
        questions = [],
        startsAt,
        endsAt,
        durationMin,
        slotDurationMin,
        pointsTotal,
        timePerQuestionSec,
        attemptsLeft,
        allowedReRecords,
        strictMode,
      } = req.body;
      const teacherId = req.user.sub;

      if (!title) {
        return res.status(400).json({ message: "title is required" });
      }

      const examCode = `DRAFT-${Date.now()}`;

      const newDraft = await Exam.create({
        title,
        description: shortDescription || "",
        shortDescription: shortDescription || "",
        instructions: instructions || "",
        examCode,
        teacherId,
        status: "draft",
        questions: Array.isArray(questions) ? questions : [],
        branches: Array.isArray(branches) ? branches : [],
        semesters: Array.isArray(semesters) ? semesters : [],
        startTime: startsAt ? new Date(startsAt) : undefined,
        endTime: endsAt ? new Date(endsAt) : undefined,
        durationMinutes: durationMin,
        slotDurationMinutes: slotDurationMin,
        pointsTotal: pointsTotal ?? 100,
        timePerQuestion: timePerQuestionSec,
        attemptsAllowed: attemptsLeft ?? 1,
        allowedReRecords: allowedReRecords ?? 1,
        strictMode: strictMode ?? false,
        settings: {
          thinkTimeSeconds: 10,
          answerTimeSeconds: 60,
          reRecordAllowed: 1,
          ttsVoice: "en_us_female",
        },
      });

      // Transform for frontend compatibility
      const transformedDraft = transformExamForFrontend(newDraft.toObject());

      return res.status(201).json(transformedDraft);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/faculty/exams/drafts/:draftId
 * Get a specific draft exam
 */
router.get(
  "/exams/drafts/:draftId",
  authMiddleware,
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const { draftId } = req.params;
      const teacherId = req.user.sub;

      const draft = await Exam.findById(draftId);

      if (!draft) {
        return res.status(404).json({ message: "Draft not found" });
      }

      if (draft.teacherId.toString() !== teacherId) {
        return res.status(403).json({ message: "Forbidden: not your draft" });
      }

      if (draft.status !== "draft") {
        return res.status(400).json({ message: "Exam is not in draft status" });
      }

      const draftObj = draft.toObject();
      if (!draftObj.questions || draftObj.questions.length === 0) {
        const dbQuestions = await Question.find({ examId: draft._id }).sort({ order: 1 });
        if (dbQuestions && dbQuestions.length > 0) {
          draftObj.questions = dbQuestions.map((q) => ({
            id: q._id,
            text: q.text,
            question: q.text,
            type: q.type,
            marks: q.marks,
            options: q.options,
            expectedAnswer: q.expectedAnswer,
            instruction: q.instruction,
            media: q.media,
            perQuestionSettings: q.perQuestionSettings,
          }));
        }
      }

      // Transform for frontend compatibility
      const transformedDraft = transformExamForFrontend(draftObj);

      return res.status(200).json(transformedDraft);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PUT /api/faculty/exams/drafts/:draftId
 * Update a draft exam
 */
router.put(
  "/exams/drafts/:draftId",
  authMiddleware,
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const { draftId } = req.params;
      const teacherId = req.user.sub;

      const draft = await Exam.findById(draftId);

      if (!draft) {
        return res.status(404).json({ message: "Draft not found" });
      }

      if (draft.teacherId.toString() !== teacherId) {
        return res.status(403).json({ message: "Forbidden: not your draft" });
      }

      if (draft.status !== "draft") {
        return res.status(400).json({ message: "Exam is not in draft status" });
      }

      // Update allowed fields
      const {
        title,
        description,
        questions,
        settings,
        shortDescription,
        instructions,
        branches,
        semesters,
        startsAt,
        endsAt,
        durationMin,
        slotDurationMin,
        pointsTotal,
        timePerQuestionSec,
        attemptsLeft,
        allowedReRecords,
        strictMode,
      } = req.body;
      if (title !== undefined) draft.title = title;
      if (shortDescription !== undefined) draft.shortDescription = shortDescription;
      if (description !== undefined) draft.description = description;
      if (shortDescription !== undefined && !description) draft.description = shortDescription;
      if (instructions !== undefined) draft.instructions = instructions;
      if (questions !== undefined && Array.isArray(questions)) draft.questions = questions;
      if (settings) draft.settings = { ...draft.settings, ...settings };
      if (Array.isArray(branches)) draft.branches = branches;
      if (Array.isArray(semesters)) draft.semesters = semesters;
      if (startsAt) draft.startTime = new Date(startsAt);
      if (endsAt) draft.endTime = new Date(endsAt);
      if (durationMin !== undefined) draft.durationMinutes = durationMin;
      if (slotDurationMin !== undefined) draft.slotDurationMinutes = slotDurationMin;
      if (pointsTotal !== undefined) draft.pointsTotal = pointsTotal;
      if (timePerQuestionSec !== undefined) draft.timePerQuestion = timePerQuestionSec;
      if (attemptsLeft !== undefined) draft.attemptsAllowed = attemptsLeft;
      if (allowedReRecords !== undefined) draft.allowedReRecords = allowedReRecords;
      if (strictMode !== undefined) draft.strictMode = strictMode;

      await draft.save();

      // Transform for frontend compatibility
      const transformedDraft = transformExamForFrontend(draft.toObject());

      return res.status(200).json(transformedDraft);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * DELETE /api/faculty/exams/drafts/:draftId
 * Delete a draft exam
 */
router.delete(
  "/exams/drafts/:draftId",
  authMiddleware,
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const { draftId } = req.params;
      const teacherId = req.user.sub;

      const draft = await Exam.findById(draftId);

      if (!draft) {
        return res.status(404).json({ message: "Draft not found" });
      }

      if (draft.teacherId.toString() !== teacherId) {
        return res.status(403).json({ message: "Forbidden: not your draft" });
      }

      if (draft.status !== "draft") {
        return res.status(400).json({ message: "Exam is not in draft status" });
      }

      await Exam.findByIdAndDelete(draftId);

      return res.status(200).json({ message: "Draft deleted successfully" });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/faculty/exams/drafts/:draftId/publish
 * Publish a draft exam (change status to published, save questions)
 */
router.post(
  "/exams/drafts/:draftId/publish",
  authMiddleware,
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const { draftId } = req.params;
      const teacherId = req.user.sub;
      const {
        startsAt,
        endsAt,
        durationMin,
        slotDurationMin,
        pointsTotal,
        settingsSummary,
        questions,
        branches,
        semesters,
      } = req.body;

      console.log("=== PUBLISH EXAM ===");
      console.log("draftId:", draftId);
      console.log("questions received:", questions);
      console.log("questions length:", questions ? questions.length : 0);
      console.log("slotDurationMin:", slotDurationMin);

      if (!startsAt || !endsAt) {
        return res
          .status(400)
          .json({ message: "startsAt and endsAt are required" });
      }

      const draft = await Exam.findById(draftId);

      if (!draft) {
        return res.status(404).json({ message: "Draft not found" });
      }

      if (draft.teacherId.toString() !== teacherId) {
        return res.status(403).json({ message: "Forbidden: not your draft" });
      }

      if (draft.status !== "draft") {
        return res.status(400).json({ message: "Exam is not in draft status" });
      }

      // Update exam with publication details
      draft.status = "published";

      // 🔒 AI readiness check before publishing exam
      const pendingQuestions = await Question.find({
        examId: draftId,
        isReadyForPublish: false,
      });

      if (pendingQuestions.length > 0) {
        return res.status(409).json({
          message: "Some questions are still generating audio or rubric",
          pendingCount: pendingQuestions.length,
        });
      }

      draft.startTime = new Date(startsAt);
      draft.endTime = new Date(endsAt);
      draft.durationMinutes = durationMin;
      if (slotDurationMin != null) draft.slotDurationMinutes = slotDurationMin;
      draft.pointsTotal = pointsTotal;
      if (settingsSummary) {
        draft.settings = { ...draft.settings, ...settingsSummary };
      }

      // 🟢 Save branches and semesters
      if (Array.isArray(branches)) {
        draft.branches = branches;
      }
      if (Array.isArray(semesters)) {
        draft.semesters = semesters;
      }

      if (Array.isArray(questions)) {
        draft.questions = questions;
      }
      await draft.save();

      // Save questions if provided
      if (questions && Array.isArray(questions) && questions.length > 0) {
        // Filter out any frontend-only helper questions (like 'file_upload') to prevent Mongoose validation errors
        const validQuestions = questions.filter(q => ["mcq", "viva", "interview"].includes(q?.type));
        console.log("Saving", validQuestions.length, "valid questions (out of", questions.length, "received)...");

        // Delete existing questions for this exam
        await Question.deleteMany({ examId: draftId });

        if (validQuestions.length > 0) {
          // Insert new questions
          const questionsToInsert = validQuestions.map((q, index) => {
            console.log("Mapping question:", q);

            // Extract URLs from media objects
            const getMediaUrl = (mediaObj) => {
              if (!mediaObj) return "";
              if (typeof mediaObj === "string") return mediaObj; // Already a URL
              if (mediaObj.url) return mediaObj.url; // Cloudinary upload object
              return "";
            };

            const mapped = {
              examId: draftId,
              teacherId: teacherId,
              text: q.text || q.title || q.question || "",
              type: q.type || "long_answer",
              marks: q.marks || q.points || 1,
              expectedAnswer: q.expectedAnswer || "",
              instruction: q.instruction || "",
              media: {
                imageUrl: getMediaUrl(q.media?.imageUrl || q.media?.image),
                fileUrl: getMediaUrl(q.media?.fileUrl || q.media?.video),
              },
              order: q.order !== undefined ? q.order : index + 1,
              perQuestionSettings: {
                thinkTimeSeconds: q.perQuestionSettings?.thinkTimeSeconds,
                answerTimeSeconds: q.perQuestionSettings?.answerTimeSeconds,
                reRecordAllowed: q.perQuestionSettings?.reRecordAllowed,
              },
            };

            // ✅ REQUIRED: audio for all question types
            mapped.requiresAudio = true;

            // ✅ REQUIRED: MCQ does not need rubric
            if (mapped.type === "mcq") {
              mapped.aiStatus = { rubric: "skipped" };
            }

            // Add options for MCQ questions
            if (
              (q.type === "mcq" || q.type === "MCQ") &&
              Array.isArray(q.options)
            ) {
              mapped.options = q.options;
              console.log("Adding options for MCQ:", mapped.options);
            }

            console.log("Mapped question:", mapped);
            return mapped;
          });

          const inserted = await Question.insertMany(questionsToInsert);
          console.log("Questions saved:", inserted.length);
          inserted.forEach((q) => {
            console.log("Saved question:", q.text, "with marks:", q.marks);
          });

          // ✅ QUEUE AI JOBS FOR EACH QUESTION (FIXED SCOPE)
          for (let index = 0; index < inserted.length; index++) {
            const q = inserted[index];

            await aiQueue.add(
              "process-question",
              { questionId: q._id },
              {
                delay: index * 30000, // ⏱ 30 seconds gap between questions
                attempts: 3,
                backoff: {
                  type: "exponential",
                  delay: 20000,
                },
                removeOnComplete: true,
                removeOnFail: false,
              },
            );

            console.log(
              `✅ AI job queued for question ${q._id.toString()} (delay ${index * 30}s)`,
            );
          }
        } else {
          console.log("No valid questions to save after filtering");
        }
      } else {
        console.log("No questions to save");
      }

      // Transform for frontend compatibility
      const transformedDraft = transformExamForFrontend(draft.toObject());

      return res.status(200).json(transformedDraft);
    } catch (error) {
      console.error("Error publishing exam:", error);
      next(error);
    }
  },
);

/**
 * GET /api/faculty/students
 * Get list of all students with optional filters
 */
router.get(
  "/students",
  authMiddleware,
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const { search, page = 1, limit = 100 } = req.query;

      let query = {};

      // Search by enrollment number, email, or username
      if (search) {
        query = {
          $or: [
            { enrollmentNumber: new RegExp(search, "i") },
            { email: new RegExp(search, "i") },
            { username: new RegExp(search, "i") },
          ],
        };
      }

      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 100;
      const skip = (pageNum - 1) * limitNum;

      const students = await Student.find(query)
        .select("_id username email enrollmentNumber branch role createdAt")
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 });

      const total = await Student.countDocuments(query);

      const studentIds = students.map((student) => student._id);
      const statsByStudent = await StudentExamAttempt.aggregate([
        {
          $match: {
            studentId: { $in: studentIds },
            totalScore: { $ne: null },
            maxScore: { $gt: 0 },
          },
        },
        {
          $group: {
            _id: "$studentId",
            examCount: { $addToSet: "$examId" },
            scoreSum: { $sum: "$totalScore" },
            maxSum: { $sum: "$maxScore" },
          },
        },
        {
          $project: {
            _id: 1,
            examCount: { $size: "$examCount" },
            averageScore: {
              $cond: [
                { $gt: ["$maxSum", 0] },
                { $multiply: [{ $divide: ["$scoreSum", "$maxSum"] }, 100] },
                0,
              ],
            },
          },
        },
      ]);

      const statsMap = statsByStudent.reduce((map, item) => {
        map[item._id.toString()] = item
        return map
      }, {})

      // Transform students for frontend
      const transformedStudents = students.map((student) => {
        const stats = statsMap[student._id.toString()] || {
          examCount: 0,
          averageScore: 0,
        }

        return {
          id: student._id,
          username: student.username,
          email: student.email,
          enrollmentNumber: student.enrollmentNumber,
          department: student.branch || '',
          examCount: stats.examCount,
          averageScore: Math.round(stats.averageScore || 0),
          role: student.role,
          joinedDate: student.createdAt,
        }
      });

      return res.status(200).json({
        students: transformedStudents,
        page: pageNum,
        limit: limitNum,
        total,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/faculty/exams/:examId/submissions
 * Get all submissions for an exam (with scores for MCQ/evaluated answers)
 */
router.get(
  "/exams/:examId/submissions",
  authMiddleware,
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const { examId } = req.params;
      const teacherId = req.user.sub;

      // Verify exam exists and belongs to this teacher
      const exam = await Exam.findById(examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }

      if (exam.teacherId.toString() !== teacherId) {
        return res.status(403).json({ message: "Forbidden: not your exam" });
      }

      // Get all attempts for this exam
      const attempts = await StudentExamAttempt.find({ examId })
        .populate("studentId", "username email enrollmentNumber")
        .sort({ startedAt: -1 });

      // Transform attempts to submission format
      const submissions = attempts.map((attempt) => ({
        studentId: attempt.studentId._id,
        studentName: attempt.studentId.username,
        studentEnrollment: attempt.studentId.enrollmentNumber,
        status: attempt.status === "evaluated" ? "completed" : attempt.status,
        score: attempt.totalScore || 0,
        maxScore: attempt.maxScore || exam.pointsTotal || 0,
        submittedAt: attempt.finishedAt
          ? attempt.finishedAt.toISOString()
          : null,
        startedAt: attempt.startedAt.toISOString(),
        attempts: 1, // Could be enhanced to count multiple attempts
        attemptId: attempt._id.toString(),
      }));

      return res.status(200).json({
        submissions,
        total: submissions.length,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/faculty/students/:studentId
 * Get a specific student's details
 */
router.get(
  "/students/:studentId",
  authMiddleware,
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const { studentId } = req.params;

      const student = await Student.findById(studentId).select(
        "_id username email enrollmentNumber role createdAt",
      );

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Transform for frontend
      const transformedStudent = {
        id: student._id,
        username: student.username,
        email: student.email,
        enrollmentNumber: student.enrollmentNumber,
        role: student.role,
        joinedDate: student.createdAt,
        examSubmissions: [],
        stats: {
          totalExams: 0,
          completedExams: 0,
          averageScore: 0,
          totalAttempts: 0,
        },
      };

      return res.status(200).json(transformedStudent);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/faculty/exams/:examId/evaluation-status
 * Get the evaluation status/progress for an exam's submissions
 */
router.get(
  "/exams/:examId/evaluation-status",
  authMiddleware,
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const { examId } = req.params;
      const teacherId = req.user.sub;

      // Verify exam belongs to teacher
      const exam = await Exam.findById(examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      if (exam.teacherId.toString() !== teacherId) {
        return res.status(403).json({ message: "Forbidden: Not your exam" });
      }

      // Fetch all attempts for this exam
      const attempts = await StudentExamAttempt.find({ examId });

      const totalAttempts = attempts.length;
      const evaluatedAttempts = attempts.filter((a) => a.status === "evaluated").length;
      
      // Pending are those that have been submitted (or are currently transcribing/evaluating) but not fully evaluated yet
      const pendingAttempts = attempts.filter((a) => 
        ["submitted", "transcribed"].includes(a.status)
      ).length;

      // Find if there are any failed answers for this exam (including previous falsely completed ones due to errors)
      const failedAnswersCount = await StudentAnswer.countDocuments({
        examId,
        $or: [
          { sttStatus: "failed" },
          { evaluationStatus: "failed" },
          { evaluationFeedback: { $regex: /FastAPI error|Fallback also failed/i } }
        ]
      });
      const hasFailures = failedAnswersCount > 0;

      // const allEvaluated = totalAttempts > 0 && evaluatedAttempts === totalAttempts;
      const allEvaluated = totalAttempts > 0 && evaluatedAttempts === totalAttempts && !hasFailures;
      // const evaluationStarted = totalAttempts > 0 && (evaluatedAttempts > 0 || pendingAttempts > 0);
      const evaluationStarted = totalAttempts > 0 && exam.evaluationStarted === true;

      return res.status(200).json({
        allEvaluated,
        evaluationStarted,
        totalAttempts,
        evaluatedAttempts,
        pendingAttempts,
        hasFailures,
        resultsPublished: exam.resultsPublished === true,
        message: allEvaluated 
          ? "All attempts have been successfully evaluated." 
          : `${evaluatedAttempts}/${totalAttempts} attempts evaluated.`,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/faculty/exams/:examId/start-evaluation
 * Start background transcription & evaluation for all submitted attempts
 */
router.post(
  "/exams/:examId/start-evaluation",
  authMiddleware,
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const { examId } = req.params;
      const teacherId = req.user.sub;

      // Verify exam belongs to teacher
      const exam = await Exam.findById(examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      if (exam.teacherId.toString() !== teacherId) {
        return res.status(403).json({ message: "Forbidden: Not your exam" });
      }

      // Find all attempts in "submitted" status (not evaluated or transcribed yet)
      const submittedAttempts = await StudentExamAttempt.find({
        examId,
        status: "submitted",
      });

      console.log(`[Evaluation] Starting evaluation for exam ${examId}. Found ${submittedAttempts.length} submitted attempts.`);

      // Added: Set evaluationStarted flag on exam and save it
      exam.evaluationStarted = true;
      await exam.save();

      let queuedCount = 0;
      for (const attempt of submittedAttempts) {
        // Queue transcription job which will chain into evaluation worker automatically
        await answersTranscriptionQueue.add(
          "transcribe-answers",
          {
            examId,
            studentId: attempt.studentId.toString(),
            attemptId: attempt._id.toString(),
          },
          {
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 2000,
            },
            removeOnComplete: true,
          }
        );
        queuedCount++;
      }

      return res.status(200).json({
        success: true,
        message: `Successfully queued ${queuedCount} attempts for evaluation.`,
        queuedCount,
      });
    } catch (error) {
      console.error("❌ Error starting exam evaluation:", error);
      next(error);
    }
  }
);

/**
 * POST /api/faculty/exams/:examId/publish-results
 * Publish evaluation results for all students
 */
router.post(
  "/exams/:examId/publish-results",
  authMiddleware,
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const { examId } = req.params;
      const teacherId = req.user.sub;

      // Verify exam belongs to teacher
      const exam = await Exam.findById(examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      if (exam.teacherId.toString() !== teacherId) {
        return res.status(403).json({ message: "Forbidden: Not your exam" });
      }

      // Check if the exam has ended
      if (exam.endTime && new Date() < new Date(exam.endTime)) {
        return res.status(400).json({ message: "Cannot publish results before the exam has ended" });
      }

      // Set resultsPublished flag to true
      exam.resultsPublished = true;
      exam.resultPublishedAt = new Date();
      await exam.save();

      console.log(`[Evaluation] Results published for exam ${examId}`);

      return res.status(200).json({
        success: true,
        message: "Exam results published successfully.",
        resultsPublished: true,
        resultPublishedAt: exam.resultPublishedAt,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/faculty/exams/:examId/retry-failed-evaluation
 * Retry background evaluation/transcription only for attempts/answers that failed
 */
router.post(
  "/exams/:examId/retry-failed-evaluation",
  authMiddleware,
  requireRole("teacher"),
  async (req, res, next) => {
    try {
      const { examId } = req.params;
      const teacherId = req.user.sub;

      // Verify exam belongs to teacher
      const exam = await Exam.findById(examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      if (exam.teacherId.toString() !== teacherId) {
        return res.status(403).json({ message: "Forbidden: Not your exam" });
      }

      // Fetch all attempts for this exam
      const attempts = await StudentExamAttempt.find({ examId });

      let retriedAttemptsCount = 0;
      let retriedAnswersCount = 0;

      for (const attempt of attempts) {
        // Find failed answers for this attempt (including previous falsely completed ones due to errors)
        const failedAnswers = await StudentAnswer.find({
          attemptId: attempt._id,
          $or: [
            { sttStatus: "failed" },
            { evaluationStatus: "failed" },
            { evaluationFeedback: { $regex: /FastAPI error|Fallback also failed/i } }
          ]
        });

        if (failedAnswers.length === 0) {
          continue; // No failures in this attempt, skip
        }

        let needsSTT = false;

        for (const answer of failedAnswers) {
          if (answer.sttStatus === "failed") {
            // Reset STT status so it can be re-transcribed
            answer.sttStatus = "pending";
            answer.sttError = null;
            needsSTT = true;
          }
          if (answer.evaluationStatus === "failed" || (answer.evaluationFeedback && /FastAPI error|Fallback also failed/i.test(answer.evaluationFeedback))) {
            // Reset evaluation status so it can be re-evaluated
            answer.evaluationStatus = "pending";
            answer.evaluationFeedback = null;
          }
          await answer.save();
          retriedAnswersCount++;
        }

        // Re-queue based on where it failed
        if (needsSTT) {
          // Change attempt status back to submitted
          attempt.status = "submitted";
          await attempt.save();

          await answersTranscriptionQueue.add(
            "transcribe-answers",
            {
              examId,
              studentId: attempt.studentId.toString(),
              attemptId: attempt._id.toString(),
            },
            {
              attempts: 3,
              backoff: {
                type: "exponential",
                delay: 2000,
              },
              removeOnComplete: true,
            }
          );
        } else {
          // STT was successful, only evaluation failed
          attempt.status = "transcribed";
          await attempt.save();

          await answersEvaluationQueue.add(
            "answers-evaluation",
            {
              examId,
              studentId: attempt.studentId.toString(),
              attemptId: attempt._id.toString(),
            },
            {
              attempts: 3,
              backoff: {
                type: "exponential",
                delay: 2000,
              },
              removeOnComplete: true,
            }
          );
        }

        retriedAttemptsCount++;
      }

      // If we retried any attempts, make sure evaluationStarted remains true
      if (retriedAttemptsCount > 0) {
        exam.evaluationStarted = true;
        await exam.save();
      }

      return res.status(200).json({
        success: true,
        message: `Successfully queued ${retriedAttemptsCount} attempts (${retriedAnswersCount} answers) for retry.`,
        retriedAttemptsCount,
        retriedAnswersCount,
      });
    } catch (error) {
      console.error("❌ Error retrying failed evaluations:", error);
      next(error);
    }
  }
);

module.exports = router;

