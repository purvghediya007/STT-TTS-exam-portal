const mongoose = require("mongoose");
const StudentAnswer = require("../models/StudentAnswer");
const StudentExamAttempt = require("../models/StudentExamAttempt");
const Question = require("../models/Question");

const PASS_PERCENTAGE = 0.5;

exports.buildAnalytics = async (studentId) => {
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return {
      examWise: [
        { examName: "Demo Exam 1", percentage: 72 },
        { examName: "Demo Exam 2", percentage: 85 },
      ],
      typeWise: [
        { type: "mcq", percentage: 80 },
        { type: "viva", percentage: 75 },
        { type: "interview", percentage: 88 },
      ],
      progress: [
        { date: new Date().toISOString(), percentage: 70 },
        { date: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(), percentage: 68 },
      ],
      aiFeedback: ["Demonstration data: no real studentId provided"],
    };
  }

  const id = new mongoose.Types.ObjectId(studentId);
  const examWise = await examWisePerformance(id);
  const typeWise = await questionTypeAnalysis(id);
  const progress = await progressOverTime(id);
  const aiFeedback = generateAIFeedback(typeWise, examWise);

  return {
    examWise,
    typeWise,
    progress,
    aiFeedback,
  };
};

async function examWisePerformance(studentId) {
  return StudentAnswer.aggregate([
    { $match: { studentId, evaluationStatus: "completed" } },
    {
      $group: {
        _id: "$examId",
        score: { $sum: "$score" },
        maxScore: { $sum: "$maxMarks" },
      },
    },
    {
      $lookup: {
        from: "exams",
        localField: "_id",
        foreignField: "_id",
        as: "exam",
      },
    },
    {
      $project: {
        examName: { $arrayElemAt: ["$exam.title", 0] },
        percentage: {
          $cond: [
            { $gt: ["$maxScore", 0] },
            { $round: [{ $multiply: [{ $divide: ["$score", "$maxScore"] }, 100] }, 2] },
            0,
          ],
        },
      },
    },
    { $sort: { percentage: -1 } },
  ]);
}

async function questionTypeAnalysis(studentId) {
  return StudentAnswer.aggregate([
    { $match: { studentId, evaluationStatus: "completed" } },
    {
      $lookup: {
        from: "questions",
        localField: "questionId",
        foreignField: "_id",
        as: "question",
      },
    },
    { $unwind: "$question" },
    {
      $group: {
        _id: "$question.type",
        score: { $sum: "$score" },
        maxScore: { $sum: "$maxMarks" },
      },
    },
    {
      $project: {
        type: "$_id",
        percentage: {
          $cond: [
            { $gt: ["$maxScore", 0] },
            { $round: [{ $multiply: [{ $divide: ["$score", "$maxScore"] }, 100] }, 2] },
            0,
          ],
        },
      },
    },
  ]);
}

async function progressOverTime(studentId) {
  return StudentExamAttempt.aggregate([
    {
      $match: {
        studentId,
        status: { $in: ["submitted", "transcribed", "evaluated"] },
        totalScore: { $ne: null },
        maxScore: { $gt: 0 },
      },
    },
    {
      $project: {
        date: { $ifNull: ["$finishedAt", "$createdAt"] },
        percentage: {
          $round: [{ $multiply: [{ $divide: ["$totalScore", "$maxScore"] }, 100] }, 2],
        },
      },
    },
    { $sort: { date: 1 } },
  ]);
}

function generateAIFeedback(typeWise, examWise) {
  const feedback = [];

  typeWise.forEach((t) => {
    if (t.percentage >= 80) {
      feedback.push(`Excellent performance in ${t.type?.toUpperCase() || 'Unknown'}`);
    } else if (t.percentage < 50) {
      feedback.push(`Needs improvement in ${t.type?.toUpperCase() || 'Unknown'}`);
    }
  });

  const avg = examWise && examWise.length
    ? examWise.reduce((a, b) => a + (b.percentage || 0), 0) / examWise.length
    : 0;

  if (avg >= 75) {
    feedback.push("Overall performance is strong and consistent");
  } else {
    feedback.push("Focus on weak areas to improve overall score");
  }

  return feedback;
}
