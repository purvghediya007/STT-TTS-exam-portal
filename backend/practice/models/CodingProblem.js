// backend/practice/models/CodingProblem.js
const mongoose = require("mongoose");

const exampleSchema = new mongoose.Schema(
  {
    input: { type: String, required: true },
    output: { type: String, required: true },
    explanation: { type: String, default: "" },
  },
  { _id: false }
);

const testCaseSchema = new mongoose.Schema(
  {
    input: { type: String, required: true }, // stdin content
    expectedOutput: { type: String, required: true }, // expected stdout
    isHidden: { type: Boolean, default: false }, // hidden = not shown to student
  },
  { _id: false }
);

const codingProblemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ["dsa", "sql"],
      index: true,
    },
    topic: {
      type: String,
      required: true,
      index: true,
    },
    difficulty: {
      type: String,
      required: true,
      enum: ["easy", "medium", "hard"],
      index: true,
    },
    description: { type: String, required: true }, // Markdown problem statement
    examples: [exampleSchema],
    constraints: [String],

    // Code templates per language (function signature the student starts with)
    codeTemplates: {
      c: { type: String, default: "" },
      cpp: { type: String, default: "" },
      java: { type: String, default: "" },
      python: { type: String, default: "" },
      javascript: { type: String, default: "" },
    },

    // Driver code per language — wraps student code with I/O handling
    // This code reads stdin, calls the student's function, prints the result
    driverCode: {
      c: { type: String, default: "" },
      cpp: { type: String, default: "" },
      java: { type: String, default: "" },
      python: { type: String, default: "" },
      javascript: { type: String, default: "" },
    },

    // Test cases — input/output pairs
    testCases: [testCaseSchema],

    // SQL-specific fields
    sqlSetupQuery: { type: String, default: "" }, // CREATE TABLE + INSERT
    sqlExpectedColumns: [String], // Expected column names
    sqlExpectedRows: { type: String, default: "" }, // JSON stringified expected rows

    // Hints (progressive)
    hints: [String],
    // Reference solution (shown after student solves it)
    solutionCode: { type: String, default: "" },
    tags: [String],

    // Stats
    solvedCount: { type: Number, default: 0 },
    attemptCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

codingProblemSchema.index({ category: 1, topic: 1, difficulty: 1 });

module.exports = mongoose.model("CodingProblem", codingProblemSchema);
