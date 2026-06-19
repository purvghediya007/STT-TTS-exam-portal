const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
});

const { Worker } = require("bullmq");
const axios = require("axios");

const Question = require("../models/Question");
const connection = require("../config/redis");
const connectDB = require("../config/db");
const { s3Client, generateTTSAudioKey, getS3Url } = require("../config/s3");
const { PutObjectCommand } = require("@aws-sdk/client-s3");

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

          // OLD TTS API CALL (BACKUP)
          // const ttsRes = await axios.post(
          //   "https://jaunita-untempering-nita.ngrok-free.dev/api/v1/tts/synthesize",
          //   {
          //     question_id: question._id.toString(),
          //     text: question.text,
          //     language: "en",
          //     slow: false,
          //   },
          //   {
          //     timeout: 30000, // ⏱ increased
          //     responseType: "arraybuffer", // ✅ binary MP3
          //   },
          // );

          const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
          const ttsRes = await axios.post(
            `${aiServiceUrl}/api/v1/tts/synthesize`,
            {
              question_id: question._id.toString(),
              text: question.text,
              language: "en",
              slow: false,
            },
            {
              timeout: 30000, // ⏱ increased
              responseType: "arraybuffer", // ✅ binary MP3
            },
          );


          console.log("🎧 AFTER TTS CALL");

          const audioBuffer = Buffer.from(ttsRes.data);

          // ===== UPLOAD TO S3 =====
          try {
            const s3Key = generateTTSAudioKey(
              question.examId.toString(),
              question._id.toString(),
            );
            const bucketName = process.env.AWS_S3_BUCKET_NAME;
            const region = process.env.AWS_S3_REGION || "us-east-1";

            console.log(`📤 Uploading TTS audio to S3: ${s3Key}`);
            console.log(`🪣 Bucket: ${bucketName}, Region: ${region}`);

            const putCommand = new PutObjectCommand({
              Bucket: bucketName,
              Key: s3Key,
              Body: audioBuffer,
              ContentType: "audio/mpeg",
            });

            await s3Client.send(putCommand);
            console.log("✅ TTS audio uploaded to S3");

            // Generate S3 URL using helper function
            const s3Url = getS3Url(s3Key);

            question.ttsGenerated = true;
            question.ttsAudioUrl = s3Url;
            question.aiStatus.audio = "done";

            console.log("✅ TTS URL saved:", s3Url);
          } catch (s3Error) {
            console.error("❌ Failed to upload TTS to S3:", s3Error.message);
            console.error("   Code:", s3Error.code);
            console.error("   StatusCode:", s3Error.$metadata?.httpStatusCode);
            question.aiStatus.audio = "failed";
            question.aiRetryCount.audio += 1;
            question.aiError.audio = `S3 upload failed: ${s3Error.message}`;
          }
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
  },
);
