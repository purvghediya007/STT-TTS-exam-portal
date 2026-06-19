// backend/practice/models/PracticeQuestion.js
const mongoose = require("mongoose");

const practiceQuestionSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      enum: ["aptitude", "technical_mcq", "technical_spoken"],
      index: true,
    },
    companies: [{
      type: String, // e.g., "TCS", "Infosys", "Google"
      index: true,
    }],
    topic: {
      type: String,
      required: true,
      index: true,
    },
    question: {
      type: String,
      required: true,
    },
    // For MCQ questions
    options: [
      {
        text: { type: String },
        isCorrect: { type: Boolean, default: false },
      },
    ],
    correctAnswer: {
      type: Number, // index of correct option (0-3)
    },
    explanation: {
      type: String,
    },
    // For spoken questions
    expectedPoints: [String], // key points expected in the answer
    sampleAnswer: {
      type: String, // reference answer for AI evaluation
    },
    // TTS audio (pre-generated for spoken questions)
    ttsGenerated: {
      type: Boolean,
      default: false,
    },
    ttsAudioUrl: {
      type: String, // S3 URL of pre-generated TTS audio
      default: null,
    },
    ttsS3Key: {
      type: String, // S3 key for cleanup
      default: null,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    marks: {
      type: Number,
      default: 1,
    },
    rubricGenerated: {
      type: Boolean,
      default: false,
    },
    rubricData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for efficient topic-based queries
practiceQuestionSchema.index({ category: 1, topic: 1 });
practiceQuestionSchema.index({ companies: 1 });

module.exports = mongoose.model("PracticeQuestion", practiceQuestionSchema);
