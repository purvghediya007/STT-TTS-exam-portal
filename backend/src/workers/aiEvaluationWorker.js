// src/workers/aiEvaluationWorker.js
const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
});

const { Worker } = require("bullmq");
const StudentExamAttempt = require("../models/StudentExamAttempt");
const StudentAnswer = require("../models/StudentAnswer");
const Exam = require("../models/Exam");
const Question = require("../models/Question");
const connection = require("../config/redis");
const connectDB = require("../config/db");
const { evaluateAnswerWithAI } = require("../services/evaluationService");
const answersEvaluationQueue = require("../queues/answersEvaluationQueue");

// ✅ Connect MongoDB for worker process
connectDB();

console.log("🚀 Evaluation Worker started");

new Worker(
  "answers-evaluation",
  async (job) => {
    console.log("\n📊 Evaluation job received:", job.data);

    try {
      const { examId, studentId, attemptId } = job.data;

      // ✅ Step 1: Fetch the StudentExamAttempt
      console.log(`📂 Fetching attempt ${attemptId}...`);
      const attempt = await StudentExamAttempt.findById(attemptId);

      if (!attempt) {
        console.error(`❌ Attempt not found: ${attemptId}`);
        return { status: "failed", error: "Attempt not found" };
      }

      console.log(`✅ Attempt found. Status: ${attempt.status}`);

      // ✅ Step 2: Fetch the Exam
      console.log(`📂 Fetching exam ${examId}...`);
      const exam = await Exam.findById(examId);

      if (!exam) {
        console.error(`❌ Exam not found: ${examId}`);
        return { status: "failed", error: "Exam not found" };
      }

      console.log(`✅ Exam found: ${exam.title}`);

      // ✅ Step 3: Fetch all Questions for this exam
      console.log(`📂 Fetching questions for exam...`);
      const questions = await Question.find({ examId }).sort({ order: 1 });

      console.log(`✅ Found ${questions.length} questions`);

      // ✅ Step 4: Fetch all StudentAnswer documents for this attempt
      console.log(`📋 Fetching answers for attempt ${attemptId}...`);
      const answers = await StudentAnswer.find({ attemptId });

      if (answers.length === 0) {
        console.log(`ℹ️ No answers found for attempt ${attemptId}`);
        // Mark as evaluated even if no answers
        attempt.status = "evaluated";
        attempt.totalScore = 0;
        attempt.maxScore = exam.pointsTotal || 0;
        await attempt.save();
        console.log(`✅ Attempt marked as evaluated (no answers)`);
        return { status: "success", message: "No answers to evaluate" };
      }

      console.log(`📝 Processing ${answers.length} answers...`);

      // ✅ Step 5: Evaluate each StudentAnswer
      let successCount = 0;
      let failureCount = 0;
      let totalScore = 0;

      for (const answer of answers) {
        try {
          // Find the question for this answer
          const question = questions.find(
            (q) => q._id.toString() === answer.questionId.toString()
          );

          if (!question) {
            console.log(`⏭️ Question ${answer.questionId} not found, skipping`);
            answer.evaluationStatus = "skipped";
            await answer.save();
            continue;
          }

          console.log(`\n🎯 Evaluating question: ${question.text}`);

          // Skip MCQ answers - they're auto-evaluated
          if (question.type === "mcq") {
            console.log(`   📌 MCQ question - auto-evaluating`);

            // Find the correct option index from options array
            const correctOptionIndex = question.options.findIndex(
              (opt) => opt.isCorrect === true
            );

            // Auto-evaluate MCQ
            const isCorrect = answer.selectedOptionIndex === correctOptionIndex;
            answer.score = isCorrect ? question.marks : 0;
            answer.maxMarks = question.marks;
            answer.evaluationFeedback = isCorrect
              ? `✅ Correct. Selected: Option ${answer.selectedOptionIndex + 1}`
              : `❌ Incorrect. Correct answer: Option ${
                  correctOptionIndex + 1
                }`;
            answer.evaluationStatus = "completed";
            answer.evaluatedAt = new Date();

            await answer.save();
            totalScore += answer.score;
            successCount++;

            console.log(`   Score: ${answer.score}/${question.marks}`);
            continue;
          }

          // For descriptive/viva answers, use LLM evaluation
          console.log(`   🤖 LLM evaluation starting...`);

          // Get the student's answer (from transcribed text or answerText)
          const studentAnswer =
            answer.transcribedText || answer.answerText || "";

          if (!studentAnswer.trim()) {
            console.log(`   ⏭️ No answer text found, skipping`);
            answer.evaluationStatus = "skipped";
            await answer.save();
            continue;
          }

          // Call LLM evaluation
          const evaluation = await evaluateAnswerWithAI({
            questionText: question.text,
            expectedAnswer: question.expectedAnswer || "N/A",
            studentAnswer: studentAnswer,
            maxMarks: question.marks,
          });

          // Store evaluation result
          answer.score = evaluation.score || 0;
          answer.maxMarks = question.marks;
          answer.evaluationFeedback = evaluation.feedback;
          answer.evaluationModel = process.env.AI_MODEL || "gemini-2.5-flash";
          answer.evaluatedAt = new Date();
          answer.evaluationStatus = "completed";

          await answer.save();
          totalScore += answer.score;
          successCount++;

          console.log(
            `   ✅ Evaluated. Score: ${answer.score}/${question.marks}`
          );
          console.log(`   Feedback: ${evaluation.feedback}`);
        } catch (answerError) {
          console.error(
            `❌ Error evaluating question ${answer.questionId}:`,
            answerError.message
          );

          // Mark as failed but continue processing other answers
          answer.evaluationStatus = "failed";
          answer.evaluationFeedback = `Error: ${answerError.message}`;
          await answer.save();
          failureCount++;
        }
      }

      // ✅ Step 6: Update StudentExamAttempt with results
      console.log(`\n📊 Updating attempt with final scores...`);
      attempt.status = "evaluated";
      attempt.totalScore = totalScore;
      attempt.maxScore = exam.pointsTotal || 0;

      const savedAttempt = await attempt.save();
      console.log(`✅ Attempt marked as evaluated`);
      console.log(`   ID: ${savedAttempt._id}`);
      console.log(`   Status: ${savedAttempt.status}`);
      console.log(
        `   Total Score: ${savedAttempt.totalScore}/${savedAttempt.maxScore}`
      );
      console.log(
        `   Percentage: ${Math.round(
          (savedAttempt.totalScore / savedAttempt.maxScore) * 100
        )}%`
      );
      console.log(`   Success: ${successCount}/${answers.length} answers`);

      if (failureCount > 0) {
        console.log(`   ⚠️ Failed: ${failureCount}/${answers.length} answers`);
      }

      return {
        status: "success",
        message: `Evaluated ${successCount} answers`,
        totalScore,
        maxScore: attempt.maxScore,
        successCount,
        failureCount,
      };
    } catch (error) {
      console.error("❌ Error in evaluation job:", error.message);
      console.error("Stack:", error.stack);
      return { status: "failed", error: error.message };
    }
  },
  { connection }
);

console.log("✅ Evaluation worker listening for jobs...");

module.exports = answersEvaluationQueue;
