// backend/practice/models/PracticeSession.js
const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PracticeQuestion",
      required: true,
    },
    // MCQ answer
    selectedOption: {
      type: Number, // 0-3 index
      default: null,
    },
    // Spoken answer
    audioData: {
      type: String, // Base64 encoded audio
      default: null,
    },
    transcript: {
      type: String, // Web Speech API transcript
      default: null,
    },
    reRecordCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["not_answered", "answered", "marked_for_review"],
      default: "not_answered",
    },
    // Evaluation results (filled after submit)
    isCorrect: {
      type: Boolean,
      default: null,
    },
    marksAwarded: {
      type: Number,
      default: 0,
    },
    explanation: {
      type: String,
      default: null,
    },
    // Spoken evaluation results
    spokenScore: {
      type: Number,
      default: null,
    },
    spokenFeedback: {
      type: String,
      default: null,
    },
    keyPointsCovered: [String],
  },
  { _id: false }
);

const practiceSessionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["aptitude", "technical_mcq", "technical_spoken"],
    },
    topic: {
      type: String,
      default: "mixed",
    },
    company: {
      type: String, // e.g., "TCS", "Google" — null if not company-specific
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "completed", "expired"],
      default: "active",
      index: true,
    },
    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PracticeQuestion",
      },
    ],
    answers: [answerSchema],
    currentIndex: {
      type: Number,
      default: 0,
    },
    questionCount: {
      type: Number,
      required: true,
    },
    timeLimit: {
      type: Number, // in seconds
      required: true,
    },
    remainingTime: {
      type: Number, // in seconds — updated periodically
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    // Final results
    score: {
      type: Number,
      default: null,
    },
    totalMarks: {
      type: Number,
      default: null,
    },
    accuracy: {
      type: Number, // percentage
      default: null,
    },
    maxReRecords: {
      type: Number,
      default: 2, // server-enforced: 2 re-records per question
    },
  },
  { timestamps: true }
);

// Auto-expire sessions that are past their time limit
practiceSessionSchema.index({ startedAt: 1, timeLimit: 1 });

module.exports = mongoose.model("PracticeSession", practiceSessionSchema);
