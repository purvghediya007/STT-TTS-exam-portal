// src/services/evaluationService.js

const { GoogleGenerativeAI } = require("@google/generative-ai");

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.AI_MODEL || "gemini-2.5-flash"; // default model

let client = null;

const getClient = () => {
  if (!API_KEY) {
    console.warn("⚠ GEMINI_API_KEY not set — AI evaluation disabled.");
    return null;
  }
  if (!client) {
    client = new GoogleGenerativeAI(API_KEY);
    console.log("Gemini client initialised with model:", MODEL_NAME);
  }
  return client;
};

// Try to extract JSON object from messy text
const extractJsonObject = (text) => {
  text = text.trim();

  // Case 1: ```json ... ``` fences
  if (text.startsWith("```")) {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // Case 2: normal text with a JSON object inside
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1).trim();
  }

  // Fallback: return as-is
  return text;
};

/**
 * Evaluate descriptive student's answer using Gemini
 */
const evaluateAnswerWithAI = async ({
  questionText,
  expectedAnswer,
  studentAnswer,
  maxMarks,
}) => {
  const genAI = getClient();

  if (!genAI) {
    return {
      score: null,
      feedback:
        "AI evaluation disabled — missing GEMINI_API_KEY. Please review manually.",
    };
  }

  if (!studentAnswer || !studentAnswer.trim()) {
    return {
      score: 0,
      feedback: "No answer provided.",
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `
You are an exam evaluator. Grade the student's answer.

You MUST respond with ONLY raw JSON, no markdown, no backticks, no explanation.
JSON structure:
{
  "score": number (0 to ${maxMarks}),
  "feedback": string
}

question: "${questionText}"
expected_answer: "${expectedAnswer || "N/A"}"
student_answer: "${studentAnswer}"

Rules:
- Use the full range 0 to ${maxMarks}.
- Be strict but fair.
- Consider correctness, completeness, relevance, clarity.
- If expected_answer is "N/A", use your own knowledge of the topic.
`;

    const response = await model.generateContent(prompt);
    let text = response.response.text() || "";
    text = text.trim();

    // Clean and extract JSON
    const jsonString = extractJsonObject(text);

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (err) {
      console.error("❌ Gemini returned invalid JSON:", text);
      return {
        score: null,
        feedback: "AI returned invalid JSON. Please review manually.",
      };
    }

    let score = parsed.score;
    if (typeof score !== "number") {
      score = null;
    }

    if (score !== null) {
      score = Math.max(0, Math.min(maxMarks, score));
    }

    return {
      score,
      feedback: parsed.feedback || "",
    };
  } catch (err) {
    console.error("❌ Gemini Evaluation Error:", err);
    return {
      score: null,
      feedback:
        "Gemini evaluation error. Please review manually or check API key/model.",
    };
  }
};

/**
 * Evaluate MCQ answer
 * @param {number} selectedOptionIndex - Index of selected option (0-3)
 * @param {number} correctOptionIndex - Index of correct option (0-3)
 * @param {number} maxMarks - Full marks for the question
 * @returns {object} {score, feedback}
 */
const evaluateMCQAnswer = ({
  selectedOptionIndex,
  correctOptionIndex,
  maxMarks,
}) => {
  if (selectedOptionIndex === null || selectedOptionIndex === undefined) {
    return {
      score: 0,
      feedback: "No answer selected.",
    };
  }

  if (selectedOptionIndex === correctOptionIndex) {
    return {
      score: maxMarks,
      feedback: "Correct answer.",
    };
  } else {
    return {
      score: 0,
      feedback: "Incorrect answer.",
    };
  }
};

module.exports = {
  evaluateAnswerWithAI,
  evaluateMCQAnswer,
};
