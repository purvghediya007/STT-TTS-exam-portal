// src/models/Question.js
const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    order: {
      type: Number,
      default: 0, // question order in exam
    },
    text: {
      type: String,
      required: true, // question text / prompt
      trim: true,
    },
    // Question type: descriptive or MCQ
    type: {
      type: String,
      enum: ["short_answer", "long_answer", "mcq", "viva", "interview"],
      default: "long_answer",
    },
    marks: {
      type: Number,
      required: true,
      min: 0,
    },
    // Model/expected answer for AI evaluation later (not visible to student)
    // For MCQ: this will be the index of correct option (0-3)
    expectedAnswer: {
      type: String,
      trim: true,
    },
    // MCQ options (only used when type === "mcq")
    options: [
      {
        text: {
          type: String,
          trim: true,
        },
        isCorrect: {
          type: Boolean,
          default: false,
        },
      },
    ],
    // Optional instructions for student for this question
    instruction: {
      type: String,
      trim: true,
    },
    // Optional media (image/file) reference
    media: {
      imageUrl: { type: String },
      fileUrl: { type: String },
    },
    // Optional per-question timing overrides (for later audio flow)
    perQuestionSettings: {
      thinkTimeSeconds: { type: Number },
      answerTimeSeconds: { type: Number },
      reRecordAllowed: { type: Number },
    },
  },
  { timestamps: true }
);

const Question = mongoose.model("Question", questionSchema);

module.exports = Question;
