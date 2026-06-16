// backend/practice/services/ttsService.js
// Pre-generates TTS audio for spoken questions and stores in S3
// Audio is generated once during seeding/update — NOT on every request

const axios = require("axios");
const path = require("path");

// Reuse existing S3 config from the platform
let s3Client, PutObjectCommand, getS3Url, BUCKET_NAME;
try {
  const s3Config = require("../../src/config/s3");
  s3Client = s3Config.s3Client;
  getS3Url = s3Config.getS3Url;
  BUCKET_NAME = s3Config.BUCKET_NAME;
  PutObjectCommand = require("@aws-sdk/client-s3").PutObjectCommand;
} catch (e) {
  console.warn("S3 config not available for TTS:", e.message);
}

// TTS API endpoint (same HuggingFace Space used by ExamEcho)
const TTS_API_URL = "https://aryanshah2109-examecho.hf.space/tts/synthesize";

/**
 * Generate S3 key for practice question TTS audio
 * Format: practice-tts/{questionId}/{timestamp}.mp3
 */
function generatePracticeTTSKey(questionId) {
  const timestamp = Date.now();
  return `practice-tts/${questionId}/${timestamp}.mp3`;
}

/**
 * Generate TTS audio for a single question and upload to S3
 * @param {Object} question - PracticeQuestion document
 * @returns {Object} - { ttsAudioUrl, success }
 */
async function generateTTSForQuestion(question) {
  if (!s3Client || !BUCKET_NAME) {
    console.warn("S3 not configured — skipping TTS generation");
    return { success: false, error: "S3 not configured" };
  }

  try {
    console.log(`🎧 Generating TTS for question: ${question._id}`);
    console.log(`   Text: "${question.question.substring(0, 80)}..."`);

    // Call the existing TTS API
    const ttsRes = await axios.post(
      TTS_API_URL,
      {
        question_id: question._id.toString(),
        text: question.question,
        language: "en",
        slow: false,
      },
      {
        timeout: 30000,
        responseType: "arraybuffer", // binary MP3
      }
    );

    const audioBuffer = Buffer.from(ttsRes.data);

    if (audioBuffer.length < 100) {
      throw new Error("TTS returned empty or too small audio");
    }

    // Upload to S3
    const s3Key = generatePracticeTTSKey(question._id.toString());

    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: audioBuffer,
      ContentType: "audio/mpeg",
    });

    await s3Client.send(putCommand);
    const s3Url = getS3Url(s3Key);

    console.log(`✅ TTS audio uploaded: ${s3Key}`);
    return { success: true, ttsAudioUrl: s3Url, s3Key };
  } catch (error) {
    console.error(`❌ TTS failed for ${question._id}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Generate TTS audio for all spoken questions that don't have audio yet
 * Called during seeding and when questions are added/updated
 */
async function generateTTSForAllSpokenQuestions(PracticeQuestion) {
  const questions = await PracticeQuestion.find({
    category: "technical_spoken",
    $or: [
      { ttsGenerated: { $ne: true } },
      { ttsAudioUrl: { $exists: false } },
      { ttsAudioUrl: null },
    ],
  });

  console.log(`\n🎧 Generating TTS for ${questions.length} spoken questions...`);

  let successCount = 0;
  let failCount = 0;

  for (const question of questions) {
    const result = await generateTTSForQuestion(question);

    if (result.success) {
      question.ttsGenerated = true;
      question.ttsAudioUrl = result.ttsAudioUrl;
      question.ttsS3Key = result.s3Key;
      await question.save();
      successCount++;
    } else {
      failCount++;
    }

    // Delay to avoid API throttling (same as existing aiWorker)
    await new Promise((r) => setTimeout(r, 3000));
  }

  console.log(`✅ TTS generation complete: ${successCount} success, ${failCount} failed\n`);
  return { successCount, failCount };
}

/**
 * Regenerate TTS for a specific question (when question text is updated)
 */
async function regenerateTTSForQuestion(question) {
  // Delete old S3 object if exists
  if (question.ttsS3Key && s3Client) {
    try {
      const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
      await s3Client.send(
        new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: question.ttsS3Key })
      );
      console.log(`🗑️ Deleted old TTS: ${question.ttsS3Key}`);
    } catch (e) {
      console.warn("Failed to delete old TTS:", e.message);
    }
  }

  // Generate new TTS
  const result = await generateTTSForQuestion(question);
  if (result.success) {
    question.ttsGenerated = true;
    question.ttsAudioUrl = result.ttsAudioUrl;
    question.ttsS3Key = result.s3Key;
    await question.save();
  }
  return result;
}

module.exports = {
  generateTTSForQuestion,
  generateTTSForAllSpokenQuestions,
  regenerateTTSForQuestion,
  generatePracticeTTSKey,
};
