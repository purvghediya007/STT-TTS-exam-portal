// src/models/StudentExamAttempt.js
const mongoose = require("mongoose");

const studentExamAttemptSchema = new mongoose.Schema(
  {
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
    status: {
      type: String,
      enum: ["in_progress", "submitted", "transcribed", "evaluated", "expired"],
      default: "in_progress",
    },
    startedAt: {
      type: Date,
      required: true,
    },
    deadlineAt: {
      type: Date, // per-student deadline = startedAt + duration (but not after exam.endTime)
      required: true,
    },
    finishedAt: {
      type: Date,
    },
    totalScore: {
      type: Number,
      default: null, // will be filled after evaluation
    },
    maxScore: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

studentExamAttemptSchema.index({ examId: 1, studentId: 1 }, { unique: true });

const StudentExamAttempt = mongoose.model(
  "StudentExamAttempt",
  studentExamAttemptSchema
);

module.exports = StudentExamAttempt;
