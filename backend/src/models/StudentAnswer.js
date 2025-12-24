// src/models/StudentAnswer.js
const mongoose = require("mongoose");

const studentAnswerSchema = new mongoose.Schema(
  {
    attemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentExamAttempt",
      required: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },

    // Student's (text) answer – later this can be transcript from audio
    answerText: {
      type: String,
      trim: true,
    },

    // 🔹 MCQ specific field - selected option index (0-3)
    selectedOptionIndex: {
      type: Number,
      min: 0,
      max: 3,
    },

    // 🔹 Audio recordings (for viva/interview questions)
    recordingUrls: [
      {
        type: String, // Cloudinary URL
        trim: true,
      },
    ],

    // 🔹 Speech-to-Text fields
    transcribedText: {
      type: String,
      trim: true,
    },
    sttStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "skipped"],
      default: "pending",
    },
    sttError: {
      type: String,
      trim: true,
    },
    sttTimestamp: {
      type: Date,
    },

    // 🔹 AI evaluation fields
    score: {
      type: Number,
      min: 0,
    },
    maxMarks: {
      type: Number,
      min: 0,
    },
    evaluationFeedback: {
      type: String,
      trim: true,
    },
    evaluationModel: {
      type: String,
      trim: true,
    },
    evaluationStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "skipped"],
      default: "pending",
    },
    evaluatedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Ensure one answer per question per attempt
studentAnswerSchema.index({ attemptId: 1, questionId: 1 }, { unique: true });

const StudentAnswer = mongoose.model("StudentAnswer", studentAnswerSchema);

module.exports = StudentAnswer;
