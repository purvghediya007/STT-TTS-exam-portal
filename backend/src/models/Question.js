// src/models/Question.js
const mongoose = require("mongoose");
const { uploadFile } = require("../services/cloudinaryService");

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
      default: 0,
    },

    text: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["mcq", "viva", "interview"],
    },

    marks: {
      type: Number,
      required: true,
      min: 0,
    },

    expectedAnswer: {
      type: String,
      trim: true,
    },

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

    instruction: {
      type: String,
      trim: true,
    },

    media: {
      imageUrl: { type: String },
      fileUrl: { type: String },
    },

    perQuestionSettings: {
      thinkTimeSeconds: { type: Number },
      answerTimeSeconds: { type: Number },
      reRecordAllowed: { type: Number },
    },

    // ====== TTS audio storage =======
    ttsGenerated: {
      type: Boolean,
      default: false,
    },

    ttsAudioUrl: {
      type: String,
      trim: true,
    },

    ttsAudioPublicId: {
      type: String,
      trim: true,
    },

    requiresAudio: {
      type: Boolean,
      default: false,
    },

    // ====== Rubric storage =======
    rubricGenerated: {
      type: Boolean,
      default: false,
    },

    rubricId: {
      type: String,
      trim: true,
    },

    rubricData: {
      type: Object,
      default: {},
    },

    // =====================================================
    // ====== NEW FIELDS (NON-BREAKING, GUARANTEE LAYER) ====
    // =====================================================

    // Unified AI processing status for publish-time validation
    aiStatus: {
      audio: {
        type: String,
        enum: ["pending", "done", "failed"],
        default: "pending",
      },
      rubric: {
        type: String,
        enum: ["pending", "done", "failed", "skipped"],
        default: "pending",
      },
    },

    // Retry counters for background jobs (Bull / Worker safety)
    aiRetryCount: {
      audio: {
        type: Number,
        default: 0,
      },
      rubric: {
        type: Number,
        default: 0,
      },
    },

    // Error visibility for debugging & teacher UI
    aiError: {
      audio: {
        type: String,
        trim: true,
      },
      rubric: {
        type: String,
        trim: true,
      },
    },

    // Lock flag to prevent exam publish until AI work is done
    isReadyForPublish: {
      type: Boolean,
      default: false,
    },
  },

  { timestamps: true }
);

const Question = mongoose.model("Question", questionSchema);

module.exports = Question;
