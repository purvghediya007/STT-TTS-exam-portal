/**
 * Frontend S3 Audio Upload Service
 * Handles direct uploads to S3 with pre-signed URLs
 */

import axiosInstance from '../api/axiosInstance';

/**
 * Get pre-signed URL from backend for S3 upload
 * @param {string} examId - Exam ID
 * @param {string} attemptId - Attempt ID
 * @param {string} questionId - Question ID
 * @returns {Promise<{presignedUrl, s3Key}>}
 */
export const getPresignedUploadUrl = async (examId, attemptId, questionId) => {
    try {
        const response = await axiosInstance.post(
            `/student/exams/${examId}/s3-presigned-url`,
            {
                attemptId,
                questionId,
            }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to get pre-signed URL');
        }

        return {
            presignedUrl: response.data.presignedUrl,
            s3Key: response.data.s3Key,
        };
    } catch (error) {
        console.error('Error getting pre-signed URL:', error);
        throw error;
    }
};

/**
 * Upload audio file directly to S3 using pre-signed URL
 * @param {string} presignedUrl - Pre-signed URL from backend
 * @param {Blob} audioBlob - Audio blob to upload
 * @returns {Promise<void>}
 */
export const uploadAudioToS3 = async (presignedUrl, audioBlob) => {
    try {
        console.log(`\n📤 Uploading audio to S3...`);
        console.log(`   Blob size: ${audioBlob.size} bytes`);
        console.log(`   Blob type: ${audioBlob.type}`);

        const response = await fetch(presignedUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'audio/webm',
            },
            body: audioBlob,
        });

        if (!response.ok) {
            throw new Error(
                `S3 upload failed with status ${response.status}: ${response.statusText}`
            );
        }

        console.log(`✅ Audio uploaded to S3 successfully`);
    } catch (error) {
        console.error('Error uploading audio to S3:', error);
        throw error;
    }
};

/**
 * Store S3 audio URL in backend database
 * @param {string} examId - Exam ID
 * @param {string} attemptId - Attempt ID
 * @param {string} questionId - Question ID
 * @param {string} s3Url - S3 URL of the uploaded audio
 * @param {string} s3Key - S3 key of the uploaded audio
 * @returns {Promise<{success, url, answerId}>}
 */
export const storeAudioUrlInBackend = async (
    examId,
    attemptId,
    questionId,
    s3Url,
    s3Key
) => {
    try {
        console.log(`\n💾 Storing S3 URL in backend...`);
        console.log(`   Exam ID: ${examId}`);
        console.log(`   Attempt ID: ${attemptId}`);
        console.log(`   Question ID: ${questionId}`);
        console.log(`   S3 URL: ${s3Url.substring(0, 50)}...`);

        const response = await axiosInstance.post(
            `/student/exams/${examId}/upload-audio`,
            {
                audioUrl: s3Url,
                s3Key: s3Key,
                attemptId,
                questionId,
            }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to store audio URL');
        }

        console.log(`✅ Audio URL stored in backend`);
        return {
            success: true,
            url: response.data.url,
            answerId: response.data.answerId,
        };
    } catch (error) {
        console.error('Error storing audio URL in backend:', error);
        throw error;
    }
};

/**
 * Complete S3 upload workflow
 * 1. Get pre-signed URL from backend
 * 2. Upload audio directly to S3
 * 3. Store S3 URL in backend database
 * @param {string} examId - Exam ID
 * @param {string} attemptId - Attempt ID
 * @param {string} questionId - Question ID
 * @param {Blob} audioBlob - Audio blob to upload
 * @returns {Promise<{success, url, answerId}>}
 */
export const uploadAudioToS3Complete = async (
    examId,
    attemptId,
    questionId,
    audioBlob
) => {
    try {
        console.log(`\n🎙️ Starting complete S3 audio upload workflow...`);

        // Step 1: Get pre-signed URL
        console.log(`\n1️⃣ Getting pre-signed URL...`);
        const { presignedUrl, s3Key } = await getPresignedUploadUrl(
            examId,
            attemptId,
            questionId
        );
        console.log(`✅ Pre-signed URL obtained`);

        // Step 2: Upload to S3
        console.log(`\n2️⃣ Uploading audio to S3...`);
        await uploadAudioToS3(presignedUrl, audioBlob);
        console.log(`✅ Audio uploaded to S3`);

        // Extract S3 URL from presigned URL (remove query parameters)
        const s3Url = presignedUrl.split('?')[0];
        console.log(`\n3️⃣ S3 URL (without presigned params): ${s3Url}`);

        // Step 3: Store URL in backend
        console.log(`\n4️⃣ Storing S3 URL in backend database...`);
        const result = await storeAudioUrlInBackend(
            examId,
            attemptId,
            questionId,
            s3Url,
            s3Key
        );
        console.log(`✅ Upload workflow complete!`);

        return result;
    } catch (error) {
        console.error('Error in S3 upload workflow:', error);
        throw error;
    }
};
