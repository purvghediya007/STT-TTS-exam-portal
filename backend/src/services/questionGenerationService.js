// src/services/questionGenerationService.js

const axios = require("axios");

const AI_MODEL_API_URL =  process.env.AI_MODEL_API_URL ||
  "https://collen-handleable-miyoko.ngrok-free.dev/questions_generate/generate";

/**
 * Call external AI model API to generate exam questions
 * @param {Object} requestData - { topics, num_questions, difficulty }
 * @returns {Promise<Object>} - Response from AI model with generated questions
 */
const generateQuestionsWithAI = async (requestData) => {
  try {
    console.log("🤖 Calling AI Model API for question generation...");
    console.log("📤 Request data:", requestData);

    const response = await axios.post(AI_MODEL_API_URL, requestData, {
      timeout: 60000, // 60 second timeout for AI processing
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("✅ AI Model API response received");
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error("❌ AI Model API Error:", error.message);
    
    let errorMessage = "Failed to generate questions";
    let statusCode = 500;

    if (error.response) {
      // API returned an error response
      errorMessage = error.response.data?.message || error.response.statusText || errorMessage;
      statusCode = error.response.status || 500;
    } else if (error.request) {
      // Request was made but no response received
      errorMessage = "No response from AI Model API";
      statusCode = 503;
    } else if (error.code === "ECONNREFUSED") {
      errorMessage = "Cannot connect to AI Model API";
      statusCode = 503;
    }

    return {
      success: false,
      error: errorMessage,
      statusCode: statusCode,
    };
  }
};

module.exports = {
  generateQuestionsWithAI,
};
