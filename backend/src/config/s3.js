const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const BUCKET_NAME = process.env.R2_BUCKET_NAME;
const EXPIRATION_TIME = 3600; // 1 hour

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Generate presigned upload URL
 */
const generatePresignedUploadUrl = async (fileName, contentType) => {
  if (!BUCKET_NAME) {
    throw new Error("R2_BUCKET_NAME environment variable is not set");
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileName,
    ContentType: contentType,
  });

  return await getSignedUrl(s3Client, command, {
    expiresIn: EXPIRATION_TIME,
  });
};

/**
 * Generate presigned download URL
 */
const generatePresignedDownloadUrl = async (fileName) => {
  if (!BUCKET_NAME) {
    throw new Error("R2_BUCKET_NAME environment variable is not set");
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileName,
  });

  return await getSignedUrl(s3Client, command, {
    expiresIn: EXPIRATION_TIME,
  });
};

/**
 * Delete object
 */
const deleteS3Object = async (fileName) => {
  if (!BUCKET_NAME) {
    throw new Error("R2_BUCKET_NAME environment variable is not set");
  }

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileName,
  });

  await s3Client.send(command);
};

/**
 * exam-answers/{examId}/{attemptId}/{questionId}/{timestamp}.webm
 */
const generateAnswerAudioKey = (examId, attemptId, questionId) => {
  return `exam-answers/${examId}/${attemptId}/${questionId}/${Date.now()}.webm`;
};

/**
 * exam-tts/{examId}/{questionId}/{timestamp}.mp3
 */
const generateTTSAudioKey = (examId, questionId) => {
  return `exam-tts/${examId}/${questionId}/${Date.now()}.mp3`;
};

/**
 * Object URL
 *
 * If bucket is PRIVATE:
 * Use generatePresignedDownloadUrl() instead.
 *
 * If bucket is PUBLIC:
 * Uses R2 public domain.
 */
const getS3Url = (key) => {
  if (process.env.R2_PUBLIC_URL) {
    return `${process.env.R2_PUBLIC_URL}/${key}`;
  }

  return `${process.env.R2_ENDPOINT}/${BUCKET_NAME}/${key}`;
};

module.exports = {
  s3Client,
  BUCKET_NAME,

  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  deleteS3Object,

  generateAnswerAudioKey,
  generateTTSAudioKey,

  getS3Url,
};
