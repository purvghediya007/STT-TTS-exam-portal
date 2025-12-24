const path = require("path");
const fs = require("fs");

/**
 * Local storage service for student answer audio files
 * Directory structure: uploads/answers/{examId}/{studentId}/{questionId}.mp3
 */

/**
 * Get the storage path for a student's answer audio
 * @param {string} examId - Exam ID
 * @param {string} studentId - Student ID
 * @param {string} questionId - Question ID
 * @returns {string} - Full file path
 */
const getAnswerAudioPath = (examId, studentId, questionId) => {
  return path.join(
    __dirname,
    "../../uploads/answers",
    examId,
    studentId,
    `${questionId}.mp3`
  );
};

/**
 * Save audio buffer to local storage
 * Creates necessary directories if they don't exist
 * @param {Buffer} audioBuffer - Audio file buffer
 * @param {string} examId - Exam ID
 * @param {string} studentId - Student ID
 * @param {string} questionId - Question ID
 * @returns {object} - { success: boolean, filePath: string, url: string, error?: string }
 */
const saveAnswerAudio = (audioBuffer, examId, studentId, questionId) => {
  try {
    if (!audioBuffer || !(audioBuffer instanceof Buffer)) {
      throw new Error("Invalid audio buffer provided");
    }

    const filePath = getAnswerAudioPath(examId, studentId, questionId);
    const dirPath = path.dirname(filePath);

    // Create directories recursively if they don't exist
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Write audio file
    fs.writeFileSync(filePath, audioBuffer);

    // Generate relative URL for serving
    const relativeUrl = `/uploads/answers/${examId}/${studentId}/${questionId}.mp3`;

    console.log(`✅ Answer audio saved: ${filePath}`);

    return {
      success: true,
      filePath,
      url: relativeUrl,
    };
  } catch (err) {
    console.error("❌ Error saving answer audio:", err.message);
    return {
      success: false,
      error: err.message,
    };
  }
};

/**
 * Delete answer audio file
 * @param {string} examId - Exam ID
 * @param {string} studentId - Student ID
 * @param {string} questionId - Question ID
 * @returns {object} - { success: boolean, error?: string }
 */
const deleteAnswerAudio = (examId, studentId, questionId) => {
  try {
    const filePath = getAnswerAudioPath(examId, studentId, questionId);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ Answer audio deleted: ${filePath}`);
      return { success: true };
    }

    return { success: true }; // File already doesn't exist
  } catch (err) {
    console.error("❌ Error deleting answer audio:", err.message);
    return {
      success: false,
      error: err.message,
    };
  }
};

/**
 * Get answer audio URL
 * @param {string} examId - Exam ID
 * @param {string} studentId - Student ID
 * @param {string} questionId - Question ID
 * @returns {string} - URL path for serving the file
 */
const getAnswerAudioUrl = (examId, studentId, questionId) => {
  return `/uploads/answers/${examId}/${studentId}/${questionId}.mp3`;
};

/**
 * Check if answer audio exists
 * @param {string} examId - Exam ID
 * @param {string} studentId - Student ID
 * @param {string} questionId - Question ID
 * @returns {boolean} - True if file exists
 */
const answerAudioExists = (examId, studentId, questionId) => {
  const filePath = getAnswerAudioPath(examId, studentId, questionId);
  return fs.existsSync(filePath);
};

module.exports = {
  saveAnswerAudio,
  deleteAnswerAudio,
  getAnswerAudioUrl,
  getAnswerAudioPath,
  answerAudioExists,
};
