const path = require("path");
const fs = require("fs");
require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
});

const { Worker } = require("bullmq");
const axios = require("axios");
const FormData = require("form-data");
const StudentExamAttempt = require("../models/StudentExamAttempt");
const StudentAnswer = require("../models/StudentAnswer");
const connection = require("../config/redis");
const connectDB = require("../config/db");
const answersEvaluationQueue = require("../queues/answersEvaluationQueue");

// ✅ Connect MongoDB for worker process
connectDB();

console.log("🚀 Transcription Worker started");

// Helper function for delays
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Speech-to-Text API function
 * Calls ExamEcho HuggingFace Space API
 * Base: https://aryanshah2109-examecho.hf.space/stt/transcribe
 *
 * @param {Buffer} audioBuffer - Audio file buffer
 * @returns {Promise<string>} - Transcribed text
 */
async function transcribeAudio(audioBuffer) {
  try {
    const formData = new FormData();
    formData.append("audio", audioBuffer, "audio.mp3");

    console.log(
      `🌐 Calling STT API: https://aryanshah2109-examecho.hf.space/stt/transcribe`
    );

    const response = await axios.post(
      "https://aryanshah2109-examecho.hf.space/stt/transcribe?lang=en",
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 60000, // 60 second timeout
      }
    );

    console.log(`✅ STT API Response:`, response.data);

    const { text } = response.data;

    if (!text) {
      throw new Error("STT API returned empty text");
    }

    return text;
  } catch (error) {
    console.error(`❌ STT API Error:`, error.message);
    throw new Error(`Speech-to-Text failed: ${error.message}`);
  }
}

new Worker(
  "answers-transcription",
  async (job) => {
    console.log("\n📝 Transcription job received:", job.data);

    try {
      const { examId, studentId, attemptId } = job.data;

      // ✅ Step 1: Fetch the StudentExamAttempt
      console.log(`📂 Fetching attempt ${attemptId}...`);
      const attempt = await StudentExamAttempt.findById(attemptId);

      if (!attempt) {
        console.error(`❌ Attempt not found: ${attemptId}`);
        return { status: "failed", error: "Attempt not found" };
      }

      // ✅ Step 2: Fetch all StudentAnswer documents for this attempt
      console.log(`📋 Fetching answers for attempt ${attemptId}...`);
      console.log(`   Query: { attemptId: "${attemptId}" }`);

      const answers = await StudentAnswer.find({ attemptId });

      console.log(`   Found: ${answers.length} answers`);
      if (answers.length > 0) {
        answers.forEach((a) => {
          console.log(`     - Answer ID: ${a._id}`);
          console.log(`       questionId: ${a.questionId}`);
          console.log(
            `       recordingUrls: ${JSON.stringify(a.recordingUrls)}`
          );
        });
      }

      if (answers.length === 0) {
        console.log(`ℹ️ No answers found for attempt ${attemptId}`);
        // Mark as transcribed even if no answers
        attempt.status = "transcribed";
        await attempt.save();
        return { status: "success", message: "No answers to transcribe" };
      }

      console.log(`📝 Processing ${answers.length} answers...`);

      // ✅ Step 3: Process each StudentAnswer
      let successCount = 0;
      let failureCount = 0;

      for (const answer of answers) {
        try {
          // Skip if no recording URLs
          if (!answer.recordingUrls || answer.recordingUrls.length === 0) {
            console.log(`⏭️ Skipping question ${answer.questionId} - no audio`);
            answer.sttStatus = "skipped";
            await answer.save();
            continue;
          }

          console.log(`\n🎤 Transcribing question ${answer.questionId}...`);

          // Get the first recording URL (usually only one per question)
          const audioUrl = answer.recordingUrls[0];

          // Build full file path if it's a relative URL
          let audioPath;
          if (audioUrl.startsWith("/uploads/")) {
            audioPath = path.join(__dirname, "../../", audioUrl);
          } else {
            audioPath = audioUrl;
          }

          console.log(`📁 Reading audio from: ${audioPath}`);

          // Read the audio file
          if (!fs.existsSync(audioPath)) {
            console.error(`❌ Audio file not found: ${audioPath}`);
            answer.sttStatus = "failed";
            answer.sttError = "Audio file not found";
            await answer.save();
            failureCount++;
            continue;
          }

          const audioBuffer = fs.readFileSync(audioPath);
          console.log(`📊 Audio file size: ${audioBuffer.length} bytes`);

          // ==========================================
          // 🎯 CALL YOUR SPEECH-TO-TEXT API HERE
          // ==========================================
          console.log(`🌐 Calling Speech-to-Text API...`);
          const transcribedText = await transcribeAudio(audioBuffer);

          // ==========================================
          // Save transcription result
          // ==========================================
          const updatedAnswer = await StudentAnswer.findByIdAndUpdate(
            answer._id,
            {
              transcribedText: transcribedText,
              sttStatus: "completed",
              sttTimestamp: new Date(),
            },
            { new: true }
          );

          if (!updatedAnswer) {
            throw new Error("Failed to update StudentAnswer");
          }

          console.log(
            `✅ Transcribed: "${transcribedText.substring(0, 100)}..."`
          );
          successCount++;
        } catch (answerError) {
          console.error(
            `❌ Failed to transcribe question ${answer.questionId}:`,
            answerError.message
          );

          // Mark this answer as failed but continue with others
          answer.sttStatus = "failed";
          answer.sttError = answerError.message;
          await answer.save();
          failureCount++;
        }
      }

      console.log(
        `\n📊 Transcription results: ${successCount} succeeded, ${failureCount} failed`
      );

      // ✅ Step 4: Update attempt status to "transcribed"
      console.log(`📤 Updating attempt status to "transcribed"...`);
      attempt.status = "transcribed";
      attempt.transcriptionCompletedAt = new Date();
      await attempt.save();

      console.log(`✅ Attempt marked as transcribed`);

      // ✅ Step 5: Queue evaluation job
      try {
        console.log(`📋 Queuing evaluation job...`);
        await answersEvaluationQueue.add(
          "evaluate-answers",
          {
            examId,
            studentId,
            attemptId: attempt._id.toString(),
          },
          {
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 2000,
            },
          }
        );
        console.log(`✅ Evaluation job queued successfully`);
      } catch (queueError) {
        console.error(`⚠️ Failed to queue evaluation job:`, queueError.message);
        // Non-critical: transcription succeeded even if queue fails
      }

      return {
        status: "success",
        examId,
        studentId,
        attemptId,
        successCount,
        failureCount,
      };
    } catch (error) {
      console.error("❌ Transcription worker error:", error.message);
      console.error("Stack:", error.stack);
      throw error; // Re-throw to trigger BullMQ retry
    }
  },
  { connection }
);

console.log("✅ Transcription worker listening for jobs...");
