// src/routes/facultyRoutes.js
const express = require("express");
const Exam = require("../models/Exam");
const Question = require("../models/Question");
const Student = require("../models/Student");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const StudentExamAttempt = require("../models/StudentExamAttempt");
const aiQueue = require("../queues/aiQueue");

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
  }
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
  }
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

      await exam.save();
      await exam.populate("teacherId", "name email username");

      return res.status(200).json(transformExamForFrontend(exam.toObject()));
    } catch (error) {
      next(error);
    }
  }
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

      // Transform for frontend compatibility
      const transformedDrafts = drafts.map((draft) =>
        transformExamForFrontend(draft.toObject())
      );

      return res.status(200).json(transformedDrafts);
    } catch (error) {
      next(error);
    }
  }
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
        questions = [],
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
        questions,
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
  }
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

      // Transform for frontend compatibility
      const transformedDraft = transformExamForFrontend(draft.toObject());

      return res.status(200).json(transformedDraft);
    } catch (error) {
      next(error);
    }
  }
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
      } = req.body;
      if (title) draft.title = title;
      if (shortDescription) draft.shortDescription = shortDescription;
      if (description) draft.description = description;
      if (shortDescription) draft.description = shortDescription;
      if (instructions) draft.instructions = instructions;
      if (questions) draft.questions = questions;
      if (settings) draft.settings = { ...draft.settings, ...settings };

      await draft.save();

      // Transform for frontend compatibility
      const transformedDraft = transformExamForFrontend(draft.toObject());

      return res.status(200).json(transformedDraft);
    } catch (error) {
      next(error);
    }
  }
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
  }
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
        pointsTotal,
        settingsSummary,
        questions,
      } = req.body;

      console.log("=== PUBLISH EXAM ===");
      console.log("draftId:", draftId);
      console.log("questions received:", questions);
      console.log("questions length:", questions ? questions.length : 0);

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
      draft.pointsTotal = pointsTotal;
      if (settingsSummary) {
        draft.settings = { ...draft.settings, ...settingsSummary };
      }

      await draft.save();

      // Save questions if provided
      if (questions && Array.isArray(questions) && questions.length > 0) {
        console.log("Saving", questions.length, "questions...");
        // Delete existing questions for this exam
        await Question.deleteMany({ examId: draftId });

        // Insert new questions
        const questionsToInsert = questions.map((q, index) => {
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
            }
          );

          console.log(
          `✅ AI job queued for question ${q._id.toString()} (delay ${index * 30}s)`
          );
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
  }
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
        .select("_id username email enrollmentNumber role createdAt")
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 });

      const total = await Student.countDocuments(query);

      // Transform students for frontend
      const transformedStudents = students.map((student) => ({
        id: student._id,
        username: student.username,
        email: student.email,
        enrollmentNumber: student.enrollmentNumber,
        role: student.role,
        joinedDate: student.createdAt,
      }));

      return res.status(200).json({
        students: transformedStudents,
        page: pageNum,
        limit: limitNum,
        total,
      });
    } catch (error) {
      next(error);
    }
  }
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
  }
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
        "_id username email enrollmentNumber role createdAt"
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

module.exports = router;
