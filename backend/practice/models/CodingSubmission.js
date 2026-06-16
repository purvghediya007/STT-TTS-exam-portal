// backend/practice/models/CodingSubmission.js
const mongoose = require("mongoose");

const testCaseResultSchema = new mongoose.Schema(
  {
    passed: { type: Boolean, required: true },
    input: { type: String },
    expectedOutput: { type: String },
    actualOutput: { type: String },
    executionTime: { type: Number, default: 0 }, // ms
    memoryUsed: { type: Number, default: 0 }, // KB
    errorOutput: { type: String, default: "" }, // stderr
  },
  { _id: false }
);

const codingSubmissionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CodingProblem",
      required: true,
    },
    language: {
      type: String,
      required: true,
      enum: ["c", "cpp", "java", "python", "javascript"],
    },
    code: { type: String, required: true },

    // Overall status
    status: {
      type: String,
      required: true,
      enum: [
        "accepted",
        "wrong_answer",
        "runtime_error",
        "time_limit_exceeded",
        "memory_limit_exceeded",
        "compilation_error",
        "internal_error",
      ],
    },

    // Per test case results
    testCaseResults: [testCaseResultSchema],
    passedCount: { type: Number, default: 0 },
    totalCount: { type: Number, default: 0 },

    // Performance
    executionTime: { type: Number, default: 0 }, // max across test cases (ms)
    memoryUsed: { type: Number, default: 0 }, // max across test cases (KB)

    // Compilation error message (for C/C++/Java)
    compileError: { type: String, default: "" },

    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

codingSubmissionSchema.index({ studentId: 1, problemId: 1 });
codingSubmissionSchema.index({ problemId: 1, status: 1 });

module.exports = mongoose.model("CodingSubmission", codingSubmissionSchema);
