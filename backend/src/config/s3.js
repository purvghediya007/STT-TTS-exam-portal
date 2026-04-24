const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Initialize S3 client with AWS credentials
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
  },
  // Force path style to ensure correct bucket addressing
  forcePathStyle: true,
  // Use signingRegion to ensure correct region is used for signing
  signingRegion: process.env.AWS_S3_REGION || "ap-south-1",
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
const EXPIRATION_TIME = 3600; // 1 hour

/**
 * Generate a pre-signed URL for direct S3 upload
 * @param {string} fileName - Name of the file to upload
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<string>} - Pre-signed URL for upload
 */
const generatePresignedUploadUrl = async (fileName, contentType) => {
  try {
    if (!BUCKET_NAME) {
      throw new Error("AWS_S3_BUCKET_NAME environment variable is not set");
    }

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: EXPIRATION_TIME,
    });

    return presignedUrl;
  } catch (error) {
    console.error("Error generating pre-signed URL:", error);
    throw error;
  }
};

/**
 * Generate a pre-signed URL for direct S3 download
 * @param {string} fileName - Name of the file to download
 * @returns {Promise<string>} - Pre-signed URL for download
 */
const generatePresignedDownloadUrl = async (fileName) => {
  try {
    if (!BUCKET_NAME) {
      throw new Error("AWS_S3_BUCKET_NAME environment variable is not set");
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: EXPIRATION_TIME,
    });

    return presignedUrl;
  } catch (error) {
    console.error("Error generating pre-signed download URL:", error);
    throw error;
  }
};

/**
 * Delete an object from S3
 * @param {string} fileName - Name of the file to delete
 * @returns {Promise<void>}
 */
const deleteS3Object = async (fileName) => {
  try {
    if (!BUCKET_NAME) {
      throw new Error("AWS_S3_BUCKET_NAME environment variable is not set");
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error("Error deleting S3 object:", error);
    throw error;
  }
};

/**
 * Generate S3 key for answer audio file
 * Format: exam-answers/{examId}/{attemptId}/{questionId}/{timestamp}.webm
 * @param {string} examId - Exam ID
 * @param {string} attemptId - Attempt ID
 * @param {string} questionId - Question ID
 * @returns {string} - S3 key
 */
const generateAnswerAudioKey = (examId, attemptId, questionId) => {
  const timestamp = Date.now();
  return `exam-answers/${examId}/${attemptId}/${questionId}/${timestamp}.webm`;
};

/**
 * Generate S3 key for TTS audio file (question audio)
 * Format: exam-tts/{examId}/{questionId}/{timestamp}.mp3
 * @param {string} examId - Exam ID
 * @param {string} questionId - Question ID
 * @returns {string} - S3 key
 */
const generateTTSAudioKey = (examId, questionId) => {
  const timestamp = Date.now();
  return `exam-tts/${examId}/${questionId}/${timestamp}.mp3`;
};

/**
 * Generate S3 URL for an object
 * @param {string} key - S3 object key
 * @returns {string} - S3 URL
 */
const getS3Url = (key) => {
  const region = process.env.AWS_S3_REGION || "ap-south-1";
  // Use path-style URL for compatibility with forcePathStyle setting
  return `https://s3.${region}.amazonaws.com/${BUCKET_NAME}/${key}`;
};

module.exports = {
  s3Client,
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  deleteS3Object,
  generateAnswerAudioKey,
  generateTTSAudioKey,
  getS3Url,
  BUCKET_NAME,
};
