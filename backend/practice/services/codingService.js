// backend/practice/services/codingService.js
const CodingProblem = require("../models/CodingProblem");
const CodingSubmission = require("../models/CodingSubmission");
const judgeService = require("./judgeService");

/**
 * Get coding problems with filters
 */
async function getProblems(filters = {}) {
  const query = {};
  if (filters.category) query.category = filters.category;
  if (filters.topic) query.topic = filters.topic;
  if (filters.difficulty) query.difficulty = filters.difficulty;

  const problems = await CodingProblem.find(query)
    .select("title slug category topic difficulty tags solvedCount attemptCount")
    .sort({ difficulty: 1, title: 1 })
    .lean();

  return problems;
}

/**
 * Get problems with student's solved status
 */
async function getProblemsWithStatus(studentId, filters = {}) {
  const problems = await getProblems(filters);

  // Get all problems this student has solved (accepted submissions)
  const solvedSubmissions = await CodingSubmission.find({
    studentId,
    status: "accepted",
  })
    .select("problemId")
    .lean();

  const solvedSet = new Set(solvedSubmissions.map((s) => s.problemId.toString()));

  return problems.map((p) => ({
    ...p,
    isSolved: solvedSet.has(p._id.toString()),
  }));
}

/**
 * Get single problem by slug (with code templates, no hidden test case details)
 */
async function getProblem(slug) {
  const problem = await CodingProblem.findOne({ slug }).lean();
  if (!problem) throw new Error("Problem not found");

  // Don't expose hidden test case inputs/outputs or driver code to frontend
  const safeProblem = {
    ...problem,
    testCases: problem.testCases.map((tc) => ({
      input: tc.isHidden ? "" : tc.input,
      expectedOutput: tc.isHidden ? "" : tc.expectedOutput,
      isHidden: tc.isHidden,
    })),
    driverCode: undefined, // never send driver code to client
  };

  return safeProblem;
}

/**
 * Run code against SAMPLE (visible) test cases only — for "Run" button
 */
async function runCode(studentId, slug, language, code) {
  const problem = await CodingProblem.findOne({ slug });
  if (!problem) throw new Error("Problem not found");

  const driverCode = problem.driverCode?.[language];
  if (!driverCode) {
    throw new Error(`Language "${language}" is not supported for this problem`);
  }

  // Run only visible test cases
  const result = await judgeService.runTestCases(
    language,
    code,
    driverCode,
    problem.testCases,
    false // don't include hidden
  );

  return {
    results: result.results,
    overallStatus: result.overallStatus,
    compileError: result.compileError,
    passedCount: result.results.filter((r) => r.passed).length,
    totalCount: result.results.length,
  };
}

/**
 * Submit code — run against ALL test cases (including hidden) and save result
 */
async function submitCode(studentId, slug, language, code) {
  const problem = await CodingProblem.findOne({ slug });
  if (!problem) throw new Error("Problem not found");

  const driverCode = problem.driverCode?.[language];
  if (!driverCode) {
    throw new Error(`Language "${language}" is not supported for this problem`);
  }

  // Increment attempt count
  await CodingProblem.updateOne({ slug }, { $inc: { attemptCount: 1 } });

  // Run ALL test cases including hidden
  const result = await judgeService.runTestCases(
    language,
    code,
    driverCode,
    problem.testCases,
    true // include hidden
  );

  const passedCount = result.results.filter((r) => r.passed).length;
  const totalCount = result.results.length;
  const maxTime = Math.max(...result.results.map((r) => r.executionTime), 0);
  const maxMemory = Math.max(...result.results.map((r) => r.memoryUsed), 0);

  // Check if this is student's first accepted for this problem
  if (result.overallStatus === "accepted") {
    const alreadySolved = await CodingSubmission.findOne({
      studentId,
      problemId: problem._id,
      status: "accepted",
    });
    if (!alreadySolved) {
      await CodingProblem.updateOne({ slug }, { $inc: { solvedCount: 1 } });
    }
  }

  // Save submission
  const submission = await CodingSubmission.create({
    studentId,
    problemId: problem._id,
    language,
    code,
    status: result.overallStatus,
    testCaseResults: result.results,
    passedCount,
    totalCount,
    executionTime: maxTime,
    memoryUsed: maxMemory,
    compileError: result.compileError,
  });

  return {
    submissionId: submission._id,
    status: result.overallStatus,
    results: result.results,
    passedCount,
    totalCount,
    executionTime: maxTime,
    memoryUsed: maxMemory,
    compileError: result.compileError,
  };
}

/**
 * Get student's submissions for a specific problem
 */
async function getSubmissions(studentId, slug) {
  const problem = await CodingProblem.findOne({ slug }).select("_id").lean();
  if (!problem) throw new Error("Problem not found");

  const submissions = await CodingSubmission.find({
    studentId,
    problemId: problem._id,
  })
    .select("language status passedCount totalCount executionTime memoryUsed submittedAt")
    .sort({ submittedAt: -1 })
    .limit(20)
    .lean();

  return submissions;
}

/**
 * Get student's overall coding progress
 */
async function getProgress(studentId) {
  const totalProblems = await CodingProblem.countDocuments();

  const solvedProblems = await CodingSubmission.distinct("problemId", {
    studentId,
    status: "accepted",
  });

  const submissions = await CodingSubmission.find({ studentId })
    .select("status")
    .lean();

  const byDifficulty = await CodingProblem.aggregate([
    { $match: { _id: { $in: solvedProblems } } },
    { $group: { _id: "$difficulty", count: { $sum: 1 } } },
  ]);

  return {
    totalProblems,
    solvedCount: solvedProblems.length,
    totalSubmissions: submissions.length,
    acceptedSubmissions: submissions.filter((s) => s.status === "accepted").length,
    byDifficulty: {
      easy: byDifficulty.find((d) => d._id === "easy")?.count || 0,
      medium: byDifficulty.find((d) => d._id === "medium")?.count || 0,
      hard: byDifficulty.find((d) => d._id === "hard")?.count || 0,
    },
  };
}

/**
 * Get available topics for coding problems
 */
async function getTopics() {
  const topics = await CodingProblem.aggregate([
    { $group: { _id: { category: "$category", topic: "$topic" }, count: { $sum: 1 } } },
    { $sort: { "_id.category": 1, "_id.topic": 1 } },
  ]);

  return topics.map((t) => ({
    category: t._id.category,
    topic: t._id.topic,
    count: t.count,
  }));
}

module.exports = {
  getProblems,
  getProblemsWithStatus,
  getProblem,
  runCode,
  submitCode,
  getSubmissions,
  getProgress,
  getTopics,
};
