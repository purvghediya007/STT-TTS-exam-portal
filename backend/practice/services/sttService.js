// backend/practice/services/sttService.js
// Uses the SAME STT API as ExamEcho's transcriptionWorker.js
// STT endpoint: https://aryanshah2109-examecho.hf.space/stt/transcribe
// IMPORTANT: STT API only accepts MP3 — we convert webm→mp3 using ffmpeg (same as transcriptionWorker)

const axios = require("axios");
const FormData = require("form-data");
const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const STT_API_URL = "https://aryanshah2109-examecho.hf.space/stt/transcribe";

/**
 * Convert audio buffer (webm/wav/etc) to MP3 format
 * Same logic as transcriptionWorker.js convertToMp3()
 * @param {Buffer} audioBuffer - Original audio buffer
 * @returns {Promise<Buffer>} - MP3 audio buffer
 */
function convertToMp3(audioBuffer) {
  return new Promise((resolve, reject) => {
    try {
      const timestamp = Date.now();
      const tempInputPath = path.join(
        __dirname,
        `../../temp_practice_input_${timestamp}.webm`
      );
      const tempOutputPath = path.join(
        __dirname,
        `../../temp_practice_output_${timestamp}.mp3`
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
            console.error("⚠️ Failed to cleanup temp files:", cleanupErr.message);
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
 * Transcribe audio buffer using ExamEcho's STT API
 * @param {Buffer} audioBuffer - Audio data buffer (must be MP3)
 * @param {string} filename - Filename with extension
 * @returns {Promise<string>} - Transcribed text
 */
async function transcribeAudio(audioBuffer, filename = "audio.mp3") {
  try {
    const formData = new FormData();
    formData.append("audio", audioBuffer, filename);

    console.log(`🌐 Calling STT API: ${STT_API_URL}`);
    console.log(`📁 Audio filename: ${filename}, size: ${audioBuffer.length} bytes`);

    const response = await axios.post(
      `${STT_API_URL}?lang=en`,
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
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    }
    throw new Error(`Speech-to-Text failed: ${error.message}`);
  }
}

/**
 * Transcribe a Base64-encoded audio string
 * Flow: Base64 → Buffer → Convert webm to MP3 → Send to STT API
 * @param {string} base64Audio - Base64 encoded audio (with or without data URI prefix)
 * @returns {Promise<string>} - Transcribed text
 */
async function transcribeBase64Audio(base64Audio) {
  if (!base64Audio) {
    throw new Error("No audio data provided");
  }

  // Remove data URI prefix if present (e.g., "data:audio/webm;codecs=opus;base64,")
  let cleanBase64 = base64Audio;
  let mimeType = "audio/webm";

  if (base64Audio.includes(",")) {
    const parts = base64Audio.split(",");
    const header = parts[0];
    cleanBase64 = parts[1];

    // Extract mime type
    const mimeMatch = header.match(/data:(audio\/[^;]+)/);
    if (mimeMatch) {
      mimeType = mimeMatch[1];
    }
  }

  const audioBuffer = Buffer.from(cleanBase64, "base64");
  console.log(`📊 Decoded audio: ${audioBuffer.length} bytes, type: ${mimeType}`);

  if (audioBuffer.length < 100) {
    throw new Error("Audio data too small — recording may be empty");
  }

  // Convert to MP3 (STT API only accepts MP3)
  console.log(`🔄 Converting ${mimeType} to MP3...`);
  let mp3Buffer;
  try {
    mp3Buffer = await convertToMp3(audioBuffer);
    console.log(`✅ Conversion complete. MP3 size: ${mp3Buffer.length} bytes`);
  } catch (convertError) {
    console.error(`❌ MP3 conversion failed:`, convertError.message);
    throw new Error(`Audio conversion failed: ${convertError.message}`);
  }

  // Send MP3 to STT API
  return transcribeAudio(mp3Buffer, "audio.mp3");
}

module.exports = {
  transcribeAudio,
  transcribeBase64Audio,
};
