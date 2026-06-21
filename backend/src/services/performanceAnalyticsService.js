// src/services/performanceAnalyticsService.js
const mongoose = require("mongoose");
const Student = require("../models/Student");
const StudentExamAttempt = require("../models/StudentExamAttempt");
const StudentAnswer = require("../models/StudentAnswer");
const Teacher = require("../models/Teacher");
const Exam = require("../models/Exam");
const Question = require("../models/Question");

const PASS_PERCENTAGE = 0.5;

const round = (value, decimals = 0) => {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

/**
 * Get performance status based on average score
 * @param {number} averageScore - Average percentage score
 * @returns {string} Status ('Excellent', 'Average', 'Needs Improvement')
 */
const getStudentStatus = (averageScore) => {
  if (averageScore >= 85) return "Excellent";
  if (averageScore >= 60) return "Average";
  return "Needs Improvement";
};

/**
 * Calculate average score for a student across all exam attempts
 * @param {string} studentId - Student MongoDB ID
 * @returns {Promise<number>} Average percentage score (0-100)
 */
const calculateAverageScore = async (studentId) => {
  const attempts = await StudentExamAttempt.find({
    studentId,
    status: { $in: ["submitted", "transcribed", "evaluated"] },
    totalScore: { $ne: null },
    maxScore: { $gt: 0 },
  });

  if (attempts.length === 0) return 0;

  let totalPercentage = 0;
  let validAttempts = 0;

  for (const attempt of attempts) {
    if (attempt.totalScore !== null && attempt.maxScore && attempt.maxScore > 0) {
      const percentage = (attempt.totalScore / attempt.maxScore) * 100;
      totalPercentage += percentage;
      validAttempts++;
    }
  }

  return validAttempts > 0 ? Math.round(totalPercentage / validAttempts) : 0;
};

const getTeacherExamsAndAttempts = async (teacherId) => {
  const teacherObjectId = new mongoose.Types.ObjectId(teacherId);
  const exams = await Exam.find({ teacherId: teacherObjectId })
    .select("_id title examCode startTime")
    .lean();

  const examIds = exams.map((exam) => exam._id);
  if (examIds.length === 0) {
    return { exams, examIds, attempts: [] };
  }

  const attempts = await StudentExamAttempt.find({
    examId: { $in: examIds },
    status: { $in: ["submitted", "transcribed", "evaluated"] },
    totalScore: { $ne: null },
    maxScore: { $gt: 0 },
  })
    .select("examId startedAt finishedAt totalScore maxScore createdAt")
    .lean();

  return { exams, examIds, attempts };
};

const computeDifficultyIndex = (avgScore, passRate) => {
  const difficulty = 1 - (avgScore / 100) * 0.55 - (passRate / 100) * 0.45;
  return Math.max(0, Math.min(100, round(difficulty * 100, 0)));
};

const getExamPerformance = async (teacherId) => {
  const { exams, attempts } = await getTeacherExamsAndAttempts(teacherId);
  const examMap = new Map(exams.map((exam) => [String(exam._id), exam]));
  const examStats = new Map();

  for (const attempt of attempts) {
    const key = String(attempt.examId);
    const item = examStats.get(key) || {
      scoreSum: 0,
      maxSum: 0,
      passCount: 0,
      count: 0,
    };
    const percent = attempt.maxScore > 0 ? attempt.totalScore / attempt.maxScore : 0;
    item.scoreSum += attempt.totalScore;
    item.maxSum += attempt.maxScore;
    item.passCount += percent >= PASS_PERCENTAGE ? 1 : 0;
    item.count += 1;
    examStats.set(key, item);
  }

  return Array.from(examStats.entries()).map(([examId, stats]) => {
    const exam = examMap.get(examId) || {};
    const avgScore = stats.maxSum > 0 ? (stats.scoreSum / stats.maxSum) * 100 : 0;
    return {
      examId,
      examName: exam.title || "Untitled Exam",
      examCode: exam.examCode || "",
      averageScore: round(avgScore, 2),
      passRate: round((stats.passCount / stats.count) * 100, 2),
      attempts: stats.count,
      difficultyIndex: computeDifficultyIndex(round(avgScore, 2), round((stats.passCount / stats.count) * 100, 2)),
    };
  })
    .sort((a, b) => b.averageScore - a.averageScore);
};

const getQuestionDifficulty = async (teacherId) => {
  const teacherObjectId = new mongoose.Types.ObjectId(teacherId);
  return StudentAnswer.aggregate([
    {
      $match: {
        evaluationStatus: "completed",
        score: { $ne: null },
        maxMarks: { $gt: 0 },
      },
    },
    {
      $lookup: {
        from: "questions",
        localField: "questionId",
        foreignField: "_id",
        as: "question",
      },
    },
    { $unwind: "$question" },
    { $match: { "question.teacherId": teacherObjectId } },
    {
      $group: {
        _id: "$questionId",
        question: { $first: "$question" },
        scoreSum: { $sum: "$score" },
        maxSum: { $sum: "$maxMarks" },
        passCount: {
          $sum: {
            $cond: [
              { $gte: [{ $divide: ["$score", "$maxMarks"] }, PASS_PERCENTAGE] },
              1,
              0,
            ],
          },
        },
        answerCount: { $sum: 1 },
      },
    },
    {
      $project: {
        questionId: "$_id",
        examId: "$question.examId",
        text: "$question.text",
        type: "$question.type",
        avgScore: {
          $round: [
            { $multiply: [{ $divide: ["$scoreSum", "$maxSum"] }, 100] },
            2,
          ],
        },
        passRate: {
          $round: [
            { $multiply: [{ $divide: ["$passCount", "$answerCount"] }, 100] },
            2,
          ],
        },
      },
    },
    {
      $addFields: {
        difficultyIndex: {
          $round: [
            {
              $multiply: [
                {
                  $subtract: [
                    1,
                    {
                      $add: [
                        { $multiply: [{ $divide: ["$avgScore", 100] }, 0.55] },
                        { $multiply: [{ $divide: ["$passRate", 100] }, 0.45] },
                      ],
                    },
                  ],
                },
                100,
              ],
            },
            0,
          ],
        },
      },
    },
    { $sort: { difficultyIndex: -1, avgScore: 1 } },
  ]);
};

const getTopicWeakness = async (teacherId) => {
  const teacherObjectId = new mongoose.Types.ObjectId(teacherId);
  return StudentAnswer.aggregate([
    {
      $match: {
        evaluationStatus: "completed",
        score: { $ne: null },
        maxMarks: { $gt: 0 },
      },
    },
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
      $match: {
        "question.teacherId": teacherObjectId,
        "question.topic": { $exists: true, $ne: "" },
      },
    },
    {
      $group: {
        _id: "$question.topic",
        scoreSum: { $sum: "$score" },
        maxSum: { $sum: "$maxMarks" },
        passCount: {
          $sum: {
            $cond: [
              { $gte: [{ $divide: ["$score", "$maxMarks"] }, PASS_PERCENTAGE] },
              1,
              0,
            ],
          },
        },
        answerCount: { $sum: 1 },
      },
    },
    {
      $project: {
        topic: "$_id",
        avgScore: {
          $round: [
            { $multiply: [{ $divide: ["$scoreSum", "$maxSum"] }, 100] },
            2,
          ],
        },
        passRate: {
          $round: [
            { $multiply: [{ $divide: ["$passCount", "$answerCount"] }, 100] },
            2,
          ],
        },
      },
    },
    {
      $addFields: {
        difficultyIndex: {
          $round: [
            {
              $multiply: [
                {
                  $subtract: [
                    1,
                    {
                      $add: [
                        { $multiply: [{ $divide: ["$avgScore", 100] }, 0.55] },
                        { $multiply: [{ $divide: ["$passRate", 100] }, 0.45] },
                      ],
                    },
                  ],
                },
                100,
              ],
            },
            0,
          ],
        },
      },
    },
    { $sort: { difficultyIndex: -1, avgScore: 1 } },
  ]);
};

/**
 * Get semester overview for faculty (all 8 semesters)
 * Shows: semester number, student count, average score, high score, low score
 * plus extra analytics metrics for exam performance, trends, and topic weakness.
 * @param {string} teacherId - Teacher MongoDB ID
 * @returns {Promise<Object>} Object containing semester summary and analytics sections
 */
const getSemesterOverview = async (teacherId) => {
  try {
    const teacher = await Teacher.findById(teacherId);
    if (!teacher || !teacher.department) {
      return {
        semesterData: [],
        examMetrics: [],
        completionMetrics: { weekly: [], byExam: [] },
        questionDifficulty: [],
        topicWeakness: [],
        growthTrend: { weekly: [], examPerformance: [] },
      };
    }

    const department = teacher.department;
    const semesterData = [];

    for (let sem = 1; sem <= 8; sem++) {
      const semesterStudents = await Student.find({
        branch: department,
        semester: sem,
      });
      const semesterStudentIds = semesterStudents.map((s) => s._id);

      let examCount = 0;
      if (semesterStudentIds.length > 0) {
        const examCountResult = await StudentExamAttempt.aggregate([
          {
            $match: {
              studentId: { $in: semesterStudentIds },
              status: { $in: ["submitted", "transcribed", "evaluated"] },
              totalScore: { $ne: null },
              maxScore: { $gt: 0 },
            },
          },
          {
            $group: {
              _id: "$examId",
            },
          },
          {
            $count: "examCount",
          },
        ]);

        examCount = examCountResult[0]?.examCount || 0;
      }

      console.log("DEBUG semesterCount", { sem, examCount, studentCount: semesterStudentIds.length });

      if (semesterStudentIds.length === 0) {
        semesterData.push({
          sem,
          total: 0,
          avg: 0,
          high: 0,
          low: 0,
          examCount,
        });
        continue;
      }

      const attempts = await StudentExamAttempt.find({
        studentId: { $in: semesterStudentIds },
        status: { $in: ["submitted", "transcribed", "evaluated"] },
        totalScore: { $ne: null },
        maxScore: { $gt: 0 },
      });

      if (attempts.length === 0) {
        semesterData.push({
          sem,
          total: semesterStudentIds.length,
          avg: 0,
          high: 0,
          low: 0,
          examCount,
        });
        continue;
      }

      let totalPercentage = 0;
      let maxPercentage = 0;
      let minPercentage = 100;
      let validAttempts = 0;

      for (const attempt of attempts) {
        const percentage = (attempt.totalScore / attempt.maxScore) * 100;
        totalPercentage += percentage;
        validAttempts++;
        maxPercentage = Math.max(maxPercentage, percentage);
        minPercentage = Math.min(minPercentage, percentage);
      }

      const avgPercentage = validAttempts > 0 ? Math.round(totalPercentage / validAttempts) : 0;

      semesterData.push({
        sem,
        total: semesterStudentIds.length,
        avg: avgPercentage,
        high: Math.round(maxPercentage),
        low: minPercentage === 100 ? 0 : Math.round(minPercentage),
        examCount,
      });
    }

    const examMetrics = await getExamPerformance(teacherId);
    const questionDifficulty = await getQuestionDifficulty(teacherId);

    return {
      semesterData,
      examMetrics,
      questionDifficulty,
    };
  } catch (error) {
    console.error("Error in getSemesterOverview:", error);
    throw error;
  }
};

const getExamAnalysis = async (teacherId, examId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(examId)) {
      throw new Error("Invalid exam ID");
    }

    const teacherObjectId = new mongoose.Types.ObjectId(teacherId);
    const examObjectId = new mongoose.Types.ObjectId(examId);

    const exam = await Exam.findOne({
      _id: examObjectId,
      teacherId: teacherObjectId,
    }).lean();

    if (!exam) {
      throw new Error("Exam not found or not authorized");
    }

    const questionDifficulty = await StudentAnswer.aggregate([
      {
        $match: {
          evaluationStatus: "completed",
          score: { $ne: null },
          maxMarks: { $gt: 0 },
        },
      },
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
        $match: {
          "question.teacherId": teacherObjectId,
          "question.examId": examObjectId,
        },
      },
      {
        $group: {
          _id: "$questionId",
          question: { $first: "$question" },
          scoreSum: { $sum: "$score" },
          maxSum: { $sum: "$maxMarks" },
          passCount: {
            $sum: {
              $cond: [
                {
                  $gte: [{ $divide: ["$score", "$maxMarks"] }, PASS_PERCENTAGE],
                },
                1,
                0,
              ],
            },
          },
          answerCount: { $sum: 1 },
        },
      },
      {
        $project: {
          questionId: "$_id",
          examId: "$question.examId",
          text: "$question.text",
          type: "$question.type",
          topic: "$question.topic",
          avgScore: {
            $round: [
              { $multiply: [{ $divide: ["$scoreSum", "$maxSum"] }, 100] },
              2,
            ],
          },
          passRate: {
            $round: [
              { $multiply: [{ $divide: ["$passCount", "$answerCount"] }, 100] },
              2,
            ],
          },
        },
      },
      {
        $addFields: {
          difficultyIndex: {
            $round: [
              {
                $multiply: [
                  {
                    $subtract: [
                      1,
                      {
                        $add: [
                          {
                            $multiply: [{ $divide: ["$avgScore", 100] }, 0.55],
                          },
                          {
                            $multiply: [{ $divide: ["$passRate", 100] }, 0.45],
                          },
                        ],
                      },
                    ],
                  },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
      { $sort: { difficultyIndex: -1, avgScore: 1 } },
    ]);

    const attempts = await StudentExamAttempt.find({
      examId: examObjectId,
      status: { $in: ["submitted", "transcribed", "evaluated"] },
      totalScore: { $ne: null },
      maxScore: { $gt: 0 },
    })
      .populate("studentId", "username enrollmentNumber")
      .lean();

    const studentAttempts = attempts
      .map((attempt) => {
        const percentage = attempt.maxScore
          ? round((attempt.totalScore / attempt.maxScore) * 100, 2)
          : 0;
        return {
          studentId: attempt.studentId?._id?.toString() || "",
          studentName: attempt.studentId?.username || "Unknown",
          studentEnrollment: attempt.studentId?.enrollmentNumber || "Unknown",
          score: attempt.totalScore,
          maxScore: attempt.maxScore,
          percentage,
          status: attempt.status,
          startedAt: attempt.startedAt,
          finishedAt: attempt.finishedAt,
        };
      })
      .sort((a, b) => b.percentage - a.percentage);

    const summary = {
      attempts: studentAttempts.length,
      averageScore:
        studentAttempts.length > 0
          ? round(
              studentAttempts.reduce((sum, item) => sum + item.percentage, 0) /
                studentAttempts.length,
              2
            )
          : 0,
      passRate:
        studentAttempts.length > 0
          ? round(
              (studentAttempts.filter((item) => item.percentage >= PASS_PERCENTAGE * 100).length /
                studentAttempts.length) *
                100,
              2
            )
          : 0,
    };

    return {
      exam: {
        examId: exam._id.toString(),
        examName: exam.title || "Untitled Exam",
        examCode: exam.examCode || "",
        pointsTotal: exam.pointsTotal || 0,
        startTime: exam.startTime,
        endTime: exam.endTime,
      },
      summary,
      questionDifficulty,
      studentAttempts,
    };
  } catch (error) {
    console.error("Error in getExamAnalysis:", error);
    throw error;
  }
};

/**
 * Get students list for a specific semester with performance metrics
 * @param {string} teacherId - Teacher MongoDB ID
 * @param {number} semester - Semester number (1-8)
 * @param {number} page - Page number for pagination (default 1)
 * @param {number} limit - Items per page (default 50)
 * @returns {Promise<Object>} { students, total, page, limit }
 */
const getStudentsBySemester = async (teacherId, semester, page = 1, limit = 50) => {
  try {
    const teacher = await Teacher.findById(teacherId);
    if (!teacher || !teacher.department) {
      return { students: [], total: 0, page, limit };
    }

    const department = teacher.department;

    const students = await Student.find({
      branch: department,
      semester: parseInt(semester),
    })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Student.countDocuments({
      branch: department,
      semester: parseInt(semester),
    });

    const enrichedStudents = await Promise.all(
      students.map(async (student) => {
        const averageScore = await calculateAverageScore(student._id);
        const status = getStudentStatus(averageScore);

        return {
          id: student._id,
          enrollmentNumber: student.enrollmentNumber || "N/A",
          name: student.username || "Unknown",
          semester: student.semester,
          averageScore,
          status,
        };
      })
    );

    enrichedStudents.sort((a, b) => b.averageScore - a.averageScore);

    return {
      students: enrichedStudents,
      total,
      page,
      limit,
    };
  } catch (error) {
    console.error("Error in getStudentsBySemester:", error);
    throw error;
  }
};

module.exports = {
  getStudentStatus,
  calculateAverageScore,
  getSemesterOverview,
  getStudentsBySemester,
  getExamAnalysis,
};
