// src/services/questionGenerationService.js

const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Commented out old hardcoded URL to make it dynamic and route MCQs to the correct endpoint
// const AI_MODEL_API_URL =
//   "https://jaunita-untempering-nita.ngrok-free.dev/api/v1/questions/generate";

/**
 * Call external AI model API or direct Gemini API to generate exam questions
 * @param {Object} requestData - { topics, num_questions, difficulty, type }
 * @returns {Promise<Object>} - Response from AI model with generated questions
 */
const generateQuestionsWithAI = async (requestData) => {
  /*
  // Direct Gemini API block (Commented out to prioritize external API call per user request)
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    console.log("🤖 GEMINI_API_KEY detected. Generating questions directly via Google Gen AI API...");
    console.log("📤 Request data:", requestData);
    
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const modelName = process.env.AI_MODEL || "gemini-2.5-flash";
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const { topics, num_questions, difficulty, type } = requestData;
      const qType = type || "viva";
      
      let formatInstructions = "";
      if (qType === "mcq") {
        formatInstructions = `For each question, provide a list of options (between 2 and 4 options) where exactly one option has "isCorrect": true, and all others have "isCorrect": false. "expectedAnswer" should describe which option is correct and why.`;
      } else if (qType === "viva") {
        formatInstructions = `Create viva-style conceptual questions that can be answered vocally. "expectedAnswer" should contain the key concepts or points expected in a correct verbal response. DO NOT provide options.`;
      } else {
        formatInstructions = `Create standard technical interview style questions. "expectedAnswer" should contain the detailed expected answer rubric. DO NOT provide options.`;
      }

      const prompt = `You are an AI assistant designed to generate high-quality exam questions for students.
Generate exactly ${num_questions} questions for each of the following topics: ${topics.join(", ")}.
The difficulty level of the questions should be: ${difficulty}.
The question type must be: ${qType.toUpperCase()}.

${formatInstructions}

Return the generated questions strictly as a JSON object matching this schema:
{
  "topics": {
    "Topic Name": [
      {
        "text": "Question text...",
        "expectedAnswer": "Rubric or correct answer explanation...",
        "options": [ // Only if type is "mcq"
          { "text": "Option text...", "isCorrect": true },
          { "text": "Option text...", "isCorrect": false }
        ]
      }
    ]
  }
}

Ensure the output is valid JSON. Do not include any markdown formatting, backticks, or text before/after the JSON. Just return the raw JSON.`;

      const startTime = Date.now();
      const result = await model.generateContent(prompt);
      console.log(`⏱️ Gemini content generation took: ${Date.now() - startTime}ms`);
      
      let responseText = result.response.text() || "";
      responseText = responseText.trim();
      
      if (responseText.startsWith("```")) {
        const match = responseText.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (match && match[1]) {
          responseText = match[1].trim();
        }
      }
      
      const parsedData = JSON.parse(responseText);
      return {
        success: true,
        data: parsedData,
      };
    } catch (error) {
      console.error("❌ Direct Gemini API Error:", error.message);
      return {
        success: false,
        error: `Direct Gemini question generation failed: ${error.message}`,
        statusCode: 500,
      };
    }
  }
  */

  // Fallback to external endpoint if GEMINI_API_KEY is not present
  try {
    console.log("🤖 GEMINI_API_KEY not set. Calling external AI Model API for question generation...");
    console.log("📤 Request data:", requestData);

    // Dynamically resolve target URL based on question type (mcq vs viva/theory)
    const aiServiceUrl = process.env.AI_SERVICE_URL || "https://jaunita-untempering-nita.ngrok-free.dev";
    const isMcq = requestData.type === "mcq";
    const targetApiUrl = isMcq
      ? `${aiServiceUrl}/api/v1/mcqs/generate`
      : `${aiServiceUrl}/api/v1/questions/generate`;

    console.log(`🔗 Target AI Endpoint: ${targetApiUrl}`);

    const response = await axios.post(targetApiUrl, requestData, {
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
      errorMessage =
        error.response.data?.message ||
        error.response.statusText ||
        errorMessage;
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

