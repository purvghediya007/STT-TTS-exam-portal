// src/services/evaluationService.js

const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");
const Question = require("../models/Question");

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

/* ==========================================
 * OLD GEMINI DIRECT SDK EVALUATION (BACKUP)
 * ==========================================
 *
 * const evaluateAnswerWithAI = async ({
 *   questionText,
 *   expectedAnswer,
 *   studentAnswer,
 *   maxMarks,
 * }) => {
 *   const genAI = getClient();
 * 
 *   if (!genAI) {
 *     return {
 *       score: null,
 *       feedback:
 *         "AI evaluation disabled — missing GEMINI_API_KEY. Please review manually.",
 *     };
 *   }
 * 
 *   if (!studentAnswer || !studentAnswer.trim()) {
 *     return {
 *       score: 0,
 *       feedback: "No answer provided.",
 *     };
 *   }
 * 
 *   try {
 *     const model = genAI.getGenerativeModel({ model: MODEL_NAME });
 * 
 *     const prompt = `
 * You are an exam evaluator. Grade the student's answer.
 * 
 * You MUST respond with ONLY raw JSON, no markdown, no backticks, no explanation.
 * JSON structure:
 * {
 *   "score": number (0 to ${maxMarks}),
 *   "feedback": string
 * }
 * 
 * question: "${questionText}"
 * expected_answer: "${expectedAnswer || "N/A"}"
 * student_answer: "${studentAnswer}"
 * 
 * Rules:
 * - Use the full range 0 to ${maxMarks}.
 * - Be strict but fair.
 * - Consider correctness, completeness, relevance, clarity.
 * - If expected_answer is "N/A", use your own knowledge of the topic.
 * `;
 * 
 *     const response = await model.generateContent(prompt);
 *     let text = response.response.text() || "";
 *     text = text.trim();
 * 
 *     // Clean and extract JSON
 *     const jsonString = extractJsonObject(text);
 * 
 *     let parsed;
 *     try {
 *       parsed = JSON.parse(jsonString);
 *     } catch (err) {
 *       console.error("❌ Gemini returned invalid JSON:", text);
 *       return {
 *         score: null,
 *         feedback: "AI returned invalid JSON. Please review manually.",
 *       };
 *     }
 * 
 *     let score = parsed.score;
 *     if (typeof score !== "number") {
 *       score = null;
 *     }
 * 
 *     if (score !== null) {
 *       score = Math.max(0, Math.min(maxMarks, score));
 *     }
 * 
 *     return {
 *       score,
 *       feedback: parsed.feedback || "",
 *     };
 *   } catch (err) {
 *     console.error("❌ Gemini Evaluation Error:", err);
 *     return {
 *       score: null,
 *       feedback:
 *         "Gemini evaluation error. Please review manually or check API key/model.",
 *     };
 *   }
 * };
 */

/**
 * Evaluate descriptive student's answer using FastAPI AI endpoints (Rubric + Evaluator)
 */
const evaluateAnswerWithAI = async ({
  questionId,
  questionText,
  expectedAnswer,
  studentAnswer,
  maxMarks,
}) => {
  const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
  const qId = questionId ? questionId.toString() : "test-question-id";

  if (!studentAnswer || !studentAnswer.trim()) {
    return {
      score: 0,
      feedback: "No answer provided.",
    };
  }

  try {
    let rubric = [];
    let questionDoc = null;

    // 1) Retrieve rubric if cached, otherwise generate via FastAPI
    if (questionId && questionId !== "test-question-id") {
      questionDoc = await Question.findById(questionId);
      if (questionDoc && questionDoc.rubricGenerated && questionDoc.rubricData && Array.isArray(questionDoc.rubricData.rubrics)) {
        console.log(`[Evaluation] Reusing cached rubric for question ${qId}`);
        rubric = questionDoc.rubricData.rubrics;
      }
    }

    if (rubric.length === 0) {
      console.log(`[Evaluation] Generating rubric from FastAPI for question ${qId}...`);
      const rubricRes = await axios.post(`${aiServiceUrl}/api/v1/rubrics/create`, {
        question_id: qId,
        question_text: questionText,
        max_marks: Math.round(maxMarks),
      }, { timeout: 25000 });

      if (rubricRes.data && Array.isArray(rubricRes.data.rubrics)) {
        rubric = rubricRes.data.rubrics;
        
        // Cache rubric in MongoDB Question document
        if (questionDoc) {
          questionDoc.rubricGenerated = true;
          questionDoc.rubricData = { rubrics: rubric };
          await questionDoc.save();
          console.log(`[Evaluation] Successfully cached rubric in DB for question ${qId}`);
        }
      } else {
        throw new Error("Invalid rubric format received from AI service");
      }
    }

    // 2) Call FastAPI evaluate/answer endpoint
    console.log(`[Evaluation] Calling FastAPI evaluate/answer for question ${qId}...`);
    const evalRes = await axios.post(`${aiServiceUrl}/api/v1/evaluate/answer`, {
      question_id: qId,
      question_text: questionText,
      student_answer: studentAnswer,
      // rubric: rubric, // Commented out old key to fix 422 error
      "rubrics": rubric, // Modified key to match FastAPI format
      max_marks: maxMarks,
    }, { timeout: 35000 });

    if (evalRes.data && typeof evalRes.data.score === "number") {
      const { score, strengths, weakness, justification, suggested_improvement } = evalRes.data;
      
      // Combine evaluation parameters into a clean feedback string
      const feedbackParts = [
        `💡 Justification: ${justification}`,
        `✅ Strengths: ${Array.isArray(strengths) ? strengths.join(", ") : strengths}`,
        `❌ Weaknesses: ${Array.isArray(weakness) ? weakness.join(", ") : weakness}`,
        `📈 Suggested Improvement: ${suggested_improvement}`
      ];

      return {
        score,
        feedback: feedbackParts.join("\n\n"),
      };
    } else {
      throw new Error("Invalid evaluation format received from AI service");
    }

  } catch (err) {
    console.error("❌ FastAPI Evaluation Error:", err.message);
    
    // In case of error, fall back to direct Gemini SDK grading to ensure execution safety
    console.log(`[Evaluation] Falling back to direct Gemini SDK grading...`);
    try {
      const genAI = getClient();
      if (!genAI) {
        return {
          score: null,
          feedback: `Evaluation failed: ${err.message}. Gemini fallback disabled (no API key).`,
        };
      }
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
`;
      const response = await model.generateContent(prompt);
      const cleanJson = extractJsonObject(response.response.text() || "");
      const parsed = JSON.parse(cleanJson);
      return {
        score: Math.max(0, Math.min(maxMarks, parsed.score || 0)),
        feedback: `(Fallback Evaluation) ${parsed.feedback || ""}`,
      };
    } catch (fallbackErr) {
      return {
        score: null,
        feedback: `FastAPI error: ${err.message}. Fallback also failed: ${fallbackErr.message}`,
      };
    }
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
