// src/routes/facultyRoutes.js
const express = require("express");
const Exam = require("../models/Exam");
const Question = require("../models/Question");
const Student = require("../models/Student");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const StudentExamAttempt = require("../models/StudentExamAttempt");

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
    teacherName: examObj.teacherId?.name || "Unknown Teacher",
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
      const { title, description, questions, settings, shortDescription } =
        req.body;
      if (title) draft.title = title;
      if (shortDescription) draft.description = shortDescription;
      if (description) draft.description = description;
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
          const mapped = {
            examId: draftId,
            teacherId: teacherId,
            text: q.text || q.title || q.question || "",
            type:
              q.type === "interview" ? "long_answer" : q.type || "long_answer",
            marks: q.marks || q.points || 1,
            expectedAnswer: q.expectedAnswer || "",
            instruction: q.instruction || "",
            media: {
              imageUrl: q.media?.imageUrl || q.media?.image || "",
              fileUrl: q.media?.fileUrl || q.media?.video || "",
            },
            order: q.order !== undefined ? q.order : index + 1,
            perQuestionSettings: {
              thinkTimeSeconds: q.perQuestionSettings?.thinkTimeSeconds,
              answerTimeSeconds: q.perQuestionSettings?.answerTimeSeconds,
              reRecordAllowed: q.perQuestionSettings?.reRecordAllowed,
            },
          };
          console.log("Mapped question:", mapped);
          return mapped;
        });

        const inserted = await Question.insertMany(questionsToInsert);
        console.log("Questions saved:", inserted.length);
        inserted.forEach((q) => {
          console.log("Saved question:", q.text, "with marks:", q.marks);
        });
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
