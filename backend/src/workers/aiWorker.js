// // 🔑 MUST be first
// require("dotenv").config();

// const { Worker } = require("bullmq");
// const axios = require("axios");
// const fs = require("fs");
// const path = require("path");

// const Question = require("../models/Question");
// const connection = require("../config/redis");
// const connectDB = require("../config/db");

// // ✅ Connect MongoDB for worker process
// connectDB();

// console.log("🚀 AI Worker started");

// new Worker(
//   "ai-processing",
//   async (job) => {
//     console.log("🔥 Worker picked job:", job.data);

//     try {
//       const { questionId } = job.data;

//       const question = await Question.findById(questionId);
//       if (!question) {
//         console.log("❌ Question not found:", questionId);
//         return "question_not_found";
//       }

//       /* ===== ENSURE AI FIELDS EXIST (CRITICAL) ===== */
//       question.aiStatus = question.aiStatus || {
//         audio: "pending",
//         rubric: "pending",
//       };

//       question.aiRetryCount = question.aiRetryCount || {
//         audio: 0,
//         rubric: 0,
//       };

//       question.aiError = question.aiError || {};

//       /* ================== TTS (MCQ + VIVA + INTERVIEW) ================== */
//       if (question.requiresAudio && question.aiStatus.audio !== "done") {
//         try {
//           console.log("🎧 BEFORE TTS CALL");

//           const ttsRes = await axios.post(
//             "https://aryanshah2109-examecho.hf.space/tts/synthesize",
//             {
//               question_id: question._id.toString(),
//               text: question.text,
//               language: "en",
//               slow: false,
//             },
//             {
//               timeout: 20000,
//               responseType: "arraybuffer", // ✅ CRITICAL FIX
//             }
//           );

//           console.log("🎧 AFTER TTS CALL");

//           // ✅ MP3 is already binary — DO NOT base64 decode
//           const audioBuffer = Buffer.from(ttsRes.data);

//           // ================== SAVE AUDIO LOCALLY ==================
//           const audioDir = path.join(__dirname, "../../uploads/audio");

//           if (!fs.existsSync(audioDir)) {
//             fs.mkdirSync(audioDir, { recursive: true });
//           }

//           const fileName = `tts_${question._id}.mp3`;
//           const filePath = path.join(audioDir, fileName);

//           fs.writeFileSync(filePath, audioBuffer);

//           // ✅ Save PUBLIC URL (served by Express static)
//           question.ttsGenerated = true;
//           question.ttsAudioUrl = `/uploads/audio/${fileName}`;
//           question.aiStatus.audio = "done";

//           console.log("✅ Audio saved locally:", filePath);
//         } catch (err) {
//           console.error("❌ TTS failed:", err.message);
//           question.aiStatus.audio = "failed";
//           question.aiRetryCount.audio += 1;
//           question.aiError.audio = err.message;
//         }
//       }

//       /* ================== RUBRIC (VIVA + INTERVIEW ONLY) ================== */
//       if (question.type !== "mcq") {
//         try {
//           console.log("📝 BEFORE RUBRIC CALL");

//           const rubricRes = await axios.post(
//             "https://aryanshah2109-examecho.hf.space/rubrics/create",
//             {
//               question_id: question._id.toString(),
//               question_text: question.text,
//               max_marks: question.marks,
//             },
//             { timeout: 20000 }
//           );

//           question.rubricGenerated = true;
//           question.rubricData = rubricRes.data;
//           question.aiStatus.rubric = "done";

//           console.log("✅ Rubric generated");
//         } catch (err) {
//           console.error("❌ Rubric failed:", err.message);
//           question.aiStatus.rubric = "failed";
//           question.aiRetryCount.rubric += 1;
//           question.aiError.rubric = err.message;
//         }
//       } else {
//         question.aiStatus.rubric = "skipped";
//       }

//       /* ================== FINAL READY CHECK ================== */
//       const audioOk =
//         !question.requiresAudio || question.aiStatus.audio === "done";

//       const rubricOk =
//         question.type === "mcq" || question.aiStatus.rubric === "done";

//       if (audioOk && rubricOk) {
//         question.isReadyForPublish = true;
//         console.log("✅ Question ready for publish");
//       }

//       await question.save();

//       console.log("🔎 Saved document snapshot:", {
//         ttsGenerated: question.ttsGenerated,
//         ttsAudioUrl: question.ttsAudioUrl,
//         aiStatus: question.aiStatus,
//       });

//       console.log("✅ Job completed successfully");
//       return "done";
//     } catch (err) {
//       console.error("❌ WORKER FATAL ERROR:", err);
//       throw err;
//     }
//   },
//   {
//     connection,
//     concurrency: 1, // 🧯 safe processing
//   }
// );


// 🔑 MUST be first
require("dotenv").config();

const { Worker } = require("bullmq");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

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
              timeout: 30000,              // ⏱ increased
              responseType: "arraybuffer"  // ✅ binary MP3
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
