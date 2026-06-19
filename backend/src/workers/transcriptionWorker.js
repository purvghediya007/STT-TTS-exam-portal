const path = require("path");
const fs = require("fs");
require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
});

const { Worker } = require("bullmq");
const axios = require("axios");
const FormData = require("form-data");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
const StudentExamAttempt = require("../models/StudentExamAttempt");
const StudentAnswer = require("../models/StudentAnswer");
const connection = require("../config/redis");
const connectDB = require("../config/db");
const answersEvaluationQueue = require("../queues/answersEvaluationQueue");
const { s3Client, BUCKET_NAME } = require("../config/s3");
const { GetObjectCommand } = require("@aws-sdk/client-s3");

// ✅ Connect MongoDB for worker process
connectDB();

console.log("🚀 Transcription Worker started");

// Helper function for delays
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Convert audio buffer to MP3 format
 * @param {Buffer} audioBuffer - Original audio buffer (webm, wav, etc)
 * @returns {Promise<Buffer>} - MP3 audio buffer
 */
function convertToMp3(audioBuffer) {
  return new Promise((resolve, reject) => {
    try {
      const tempInputPath = path.join(
        __dirname,
        `../../temp_input_${Date.now()}.webm`,
      );
      const tempOutputPath = path.join(
        __dirname,
        `../../temp_output_${Date.now()}.mp3`,
      );

      // Write input buffer to temp file
      fs.writeFileSync(tempInputPath, audioBuffer);

      ffmpeg(tempInputPath)
        .output(tempOutputPath)
        .audioCodec("libmp3lame")
        .audioBitrate("128k")
        .format("mp3")
        .on("end", () => {
          try {
            // Read the output MP3 file
            const mp3Buffer = fs.readFileSync(tempOutputPath);

            // Clean up temp files
            fs.unlinkSync(tempInputPath);
            fs.unlinkSync(tempOutputPath);

            resolve(mp3Buffer);
          } catch (err) {
            reject(new Error(`Failed to read MP3 file: ${err.message}`));
          }
        })
        .on("error", (err) => {
          // Clean up temp files on error
          try {
            if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
            if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
          } catch (cleanupErr) {
            console.error(
              "⚠️ Failed to cleanup temp files:",
              cleanupErr.message,
            );
          }
          reject(new Error(`FFmpeg conversion failed: ${err.message}`));
        })
        .run();
    } catch (err) {
      reject(new Error(`Failed to start conversion: ${err.message}`));
    }
  });
}

/**
 * Speech-to-Text API function
 * Calls ExamEcho HuggingFace Space API
 * Base: https://aryanshah2109-examecho.hf.space/stt/transcribe
 *
 * @param {Buffer} audioBuffer - Audio file buffer
 * @param {string} filename - Filename with extension (e.g., 'audio.webm')
 * @returns {Promise<string>} - Transcribed text
 */
async function transcribeAudio(audioBuffer, filename = "audio.wav") {
  try {
    const formData = new FormData();
    formData.append("audio", audioBuffer, filename);

    // OLD STT API CALL (BACKUP)
    // console.log(
    //   `🌐 Calling STT API: https://jaunita-untempering-nita.ngrok-free.dev/api/v1/stt/transcribe`,
    // );
    // console.log(`📁 Audio filename: ${filename}`);
    // 
    // const response = await axios.post(
    //   "https://jaunita-untempering-nita.ngrok-free.dev/api/v1/stt/transcribe",
    //   formData,
    //   {
    //     headers: formData.getHeaders(),
    //     timeout: 60000, // 60 second timeout
    //   },
    // );

    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    console.log(`🌐 Calling STT API: ${aiServiceUrl}/api/v1/stt/transcribe`);
    console.log(`📁 Audio filename: ${filename}`);

    const response = await axios.post(
      `${aiServiceUrl}/api/v1/stt/transcribe`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 60000, // 60 second timeout
      },
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
            `       recordingUrls: ${JSON.stringify(a.recordingUrls)}`,
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
            // Ensure required fields are set before saving
            if (!answer.studentId) answer.studentId = studentId;
            if (!answer.examId) answer.examId = examId;
            await answer.save();
            continue;
          }

          console.log(`\n🎤 Transcribing question ${answer.questionId}...`);

          // Get the first recording URL (usually only one per question)
          const audioUrl = answer.recordingUrls[0];
          console.log(`📁 Audio URL: ${audioUrl}`);

          let audioBuffer;

          // Check if it's a remote URL (S3, HTTPS, etc)
          if (
            audioUrl.startsWith("http://") ||
            audioUrl.startsWith("https://")
          ) {
            console.log(`☁️ Fetching audio from S3/remote URL...`);
            try {
              // Check if it's an S3 URL
              if (
                audioUrl.includes("s3.ap-south-1.amazonaws.com") ||
                audioUrl.includes("s3.amazonaws.com") ||
                audioUrl.includes(`amazonaws.com/${BUCKET_NAME}`)
              ) {
                console.log(`🪣 Detected S3 URL, fetching with AWS SDK...`);

                // Extract the S3 key from the URL
                // URL format: https://s3.region.amazonaws.com/bucket-name/key
                // or: https://bucket-name.s3.region.amazonaws.com/key
                let s3Key;
                try {
                  const urlObj = new URL(audioUrl);
                  let pathname = urlObj.pathname;

                  console.log(`🔍 Raw pathname from URL: ${pathname}`);
                  console.log(`🪣 Expected bucket name: ${BUCKET_NAME}`);

                  // Remove leading slash
                  if (pathname.startsWith("/")) {
                    pathname = pathname.substring(1);
                  }

                  console.log(`🔍 Pathname after removing slash: ${pathname}`);

                  // For path-style URLs (s3.region.amazonaws.com/bucket/key)
                  // Remove the bucket name prefix
                  if (pathname.startsWith(BUCKET_NAME + "/")) {
                    s3Key = pathname.substring(BUCKET_NAME.length + 1);
                    console.log(`✅ Removed bucket prefix`);
                  } else {
                    // Already just the key
                    s3Key = pathname;
                    console.log(`ℹ️ No bucket prefix found, using as-is`);
                  }

                  console.log(`🔑 Final S3 key: ${s3Key}`);
                } catch (urlError) {
                  console.error(`❌ Invalid S3 URL: ${audioUrl}`);
                  throw new Error(`Invalid S3 URL format: ${urlError.message}`);
                }

                // Use AWS SDK to fetch the object
                const getCommand = new GetObjectCommand({
                  Bucket: BUCKET_NAME,
                  Key: s3Key,
                });

                const s3Response = await s3Client.send(getCommand);

                // Convert stream to buffer
                const chunks = [];
                for await (const chunk of s3Response.Body) {
                  chunks.push(chunk);
                }
                audioBuffer = Buffer.concat(chunks);

                console.log(
                  `📊 Audio fetched from S3. Size: ${audioBuffer.length} bytes`,
                );
              } else {
                // Not an S3 URL, try regular HTTP fetch
                console.log(`🌐 Fetching from non-S3 remote URL...`);
                const response = await axios.get(audioUrl, {
                  responseType: "arraybuffer",
                });
                audioBuffer = Buffer.from(response.data);
                console.log(
                  `📊 Audio fetched from remote URL. Size: ${audioBuffer.length} bytes`,
                );
              }
            } catch (fetchError) {
              console.error(
                `❌ Failed to fetch audio from S3:`,
                fetchError.message,
              );
              console.error(
                `   Error code:`,
                fetchError.code || fetchError.$metadata?.httpStatusCode,
              );
              answer.sttStatus = "failed";
              answer.sttError = `Failed to fetch audio from S3: ${fetchError.message}`;
              await answer.save();
              failureCount++;
              continue;
            }
          }
          // Fallback: Check if it's a local path (backward compatibility)
          else if (audioUrl.startsWith("/uploads/")) {
            console.log(`📁 Reading audio from local disk (legacy)...`);
            const audioPath = path.join(__dirname, "../../", audioUrl);

            if (!fs.existsSync(audioPath)) {
              console.error(`❌ Audio file not found: ${audioPath}`);
              answer.sttStatus = "failed";
              answer.sttError = "Audio file not found";
              await answer.save();
              failureCount++;
              continue;
            }
            audioBuffer = fs.readFileSync(audioPath);
            console.log(
              `📊 Audio read from disk. Size: ${audioBuffer.length} bytes`,
            );
          }
          // Unknown URL format
          else {
            console.error(`❌ Invalid audio URL format: ${audioUrl}`);
            answer.sttStatus = "failed";
            answer.sttError =
              "Invalid audio URL format - must be S3 URL or /uploads/ path";
            await answer.save();
            failureCount++;
            continue;
          }

          // ==========================================
          // 🎯 CALL YOUR SPEECH-TO-TEXT API HERE
          // ==========================================
          console.log(`🌐 Calling Speech-to-Text API...`);

          // Convert webm to mp3 if needed (STT API only supports mp3)
          let finalAudioBuffer = audioBuffer;
          let audioFilename = "audio.mp3";

          if (audioUrl.endsWith(".webm")) {
            console.log(`🔄 Converting webm to mp3...`);
            try {
              finalAudioBuffer = await convertToMp3(audioBuffer);
              console.log(
                `✅ Conversion complete. MP3 size: ${finalAudioBuffer.length} bytes`,
              );
            } catch (convertError) {
              console.error(
                `❌ Failed to convert webm to mp3:`,
                convertError.message,
              );
              answer.sttStatus = "failed";
              answer.sttError = `Audio conversion failed: ${convertError.message}`;
              await answer.save();
              failureCount++;
              continue;
            }
          } else if (audioUrl.endsWith(".mp3")) {
            audioFilename = "audio.mp3";
          } else {
            // For other formats, try converting to mp3
            console.log(`🔄 Converting ${audioUrl.split(".").pop()} to mp3...`);
            try {
              finalAudioBuffer = await convertToMp3(audioBuffer);
              console.log(
                `✅ Conversion complete. MP3 size: ${finalAudioBuffer.length} bytes`,
              );
            } catch (convertError) {
              console.error(
                `⚠️ Conversion failed, trying original format:`,
                convertError.message,
              );
              // Fallback to original buffer
              finalAudioBuffer = audioBuffer;
              audioFilename = "audio.wav";
            }
          }

          console.log(`📁 Sending audio as: ${audioFilename}`);
          console.log(
            `📊 Final audio buffer size: ${finalAudioBuffer.length} bytes`,
          );
          const transcribedText = await transcribeAudio(
            finalAudioBuffer,
            audioFilename,
          );

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
            { new: true },
          );

          if (!updatedAnswer) {
            throw new Error("Failed to update StudentAnswer");
          }

          console.log(
            `✅ Transcribed: "${transcribedText.substring(0, 100)}..."`,
          );
          successCount++;
        } catch (answerError) {
          console.error(
            `❌ Failed to transcribe question ${answer.questionId}:`,
            answerError.message,
          );

          // Mark this answer as failed but continue with others
          answer.sttStatus = "failed";
          answer.sttError = answerError.message;
          // Ensure required fields are set before saving
          if (!answer.studentId) answer.studentId = studentId;
          if (!answer.examId) answer.examId = examId;
          await answer.save();
          failureCount++;
        }
      }

      console.log(
        `\n📊 Transcription results: ${successCount} succeeded, ${failureCount} failed`,
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
          },
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
  { connection },
);

console.log("✅ Transcription worker listening for jobs...");
