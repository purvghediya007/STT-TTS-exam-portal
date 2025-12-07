// src/models/Exam.js
const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    examCode: {
      type: String,
      required: true,
      unique: true, // students can use this to identify exam
      uppercase: true,
      trim: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft", // new exam is draft until teacher sets time + launches
    },
    // scheduling: set LATER when launching exam
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    // duration for one student attempt, set at launch step
    durationMinutes: {
      type: Number,
      min: 1,
    },
    // default settings for all questions of this exam (can override per question if needed)
    settings: {
      thinkTimeSeconds: {
        type: Number,
        default: 10,
      },
      answerTimeSeconds: {
        type: Number,
        default: 60,
      },
      reRecordAllowed: {
        type: Number,
        default: 1,
      },
      ttsVoice: {
        type: String,
        default: "en_us_female",
      },
    },
  },
  { timestamps: true }
);

const Exam = mongoose.model("Exam", examSchema);

module.exports = Exam;
