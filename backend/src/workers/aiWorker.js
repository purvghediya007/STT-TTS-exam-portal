
const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
});

const { Worker } = require("bullmq");
const axios = require("axios");
const fs = require("fs");

const Question = require("../models/Question");
const connection = require("../config/redis");
const connectDB = require("../config/db");

// ✅ Connect MongoDB for worker process
connectDB();

console.log("🚀 AI Worker started");

// 🕒 simple delay helper
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

new Worker(
  "ai-processing",
  async (job) => {
    console.log("🔥 Worker picked job:", job.data);

    try {
      const { questionId } = job.data;

      const question = await Question.findById(questionId);
      if (!question) {
        console.log("❌ Question not found:", questionId);
        return "question_not_found";
      }

      /* ===== ENSURE AI FIELDS EXIST ===== */
      question.aiStatus = question.aiStatus || {
        audio: "pending",
        rubric: "skipped", // 🔕 rubric disabled for now
      };

      question.aiRetryCount = question.aiRetryCount || {
        audio: 0,
        rubric: 0,
      };

      question.aiError = question.aiError || {};

      /* ================== TTS ONLY ================== */
      if (question.requiresAudio && question.aiStatus.audio !== "done") {
        try {
          console.log("🎧 BEFORE TTS CALL");

          const ttsRes = await axios.post(
            "https://aryanshah2109-examecho.hf.space/tts/synthesize",
            {
              question_id: question._id.toString(),
              text: question.text,
              language: "en",
              slow: false,
            },
            {
              timeout: 30000, // ⏱ increased
              responseType: "arraybuffer", // ✅ binary MP3
            }
          );

          console.log("🎧 AFTER TTS CALL");

          const audioBuffer = Buffer.from(ttsRes.data);

          // ===== SAVE AUDIO LOCALLY =====
          const audioDir = path.join(__dirname, "../../uploads/audio");
          if (!fs.existsSync(audioDir)) {
            fs.mkdirSync(audioDir, { recursive: true });
          }

          const fileName = `tts_${question._id}.mp3`;
          const filePath = path.join(audioDir, fileName);
          fs.writeFileSync(filePath, audioBuffer);

          question.ttsGenerated = true;
          question.ttsAudioUrl = `/uploads/audio/${fileName}`;
          question.aiStatus.audio = "done";

          console.log("✅ Audio saved:", filePath);
        } catch (err) {
          console.error("❌ TTS failed:", err.message);
          question.aiStatus.audio = "failed";
          question.aiRetryCount.audio += 1;
          question.aiError.audio = err.message;
        }
      }

      /* ===== RUBRIC TEMPORARILY SKIPPED ===== */
      question.aiStatus.rubric = "skipped";

      /* ================== READY CHECK ================== */
      const audioOk =
        !question.requiresAudio || question.aiStatus.audio === "done";

      if (audioOk) {
        question.isReadyForPublish = true;
        console.log("✅ Question ready for publish");
      }

      await question.save();

      console.log("🔎 Snapshot:", {
        audio: question.aiStatus.audio,
        url: question.ttsAudioUrl,
      });

      console.log("✅ Job completed");

      // 🕒 IMPORTANT: delay before next job (prevents API throttle)
      await sleep(3000); // 3 seconds gap

      return "done";
    } catch (err) {
      console.error("❌ WORKER FATAL ERROR:", err);
      throw err;
    }
  },
  {
    connection,
    concurrency: 1, // already correct
  }
);
