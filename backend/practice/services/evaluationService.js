// backend/practice/services/evaluationService.js
const PracticeSession = require("../models/PracticeSession");
const PracticeQuestion = require("../models/PracticeQuestion");
const { transcribeBase64Audio } = require("./sttService");
const axios = require("axios"); // Added for FastAPI evaluation requests


// Use existing Gemini AI from the platform
let genAI = null;
try {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
} catch (e) {
  console.warn("Gemini AI not available for spoken evaluation:", e.message);
}

/**
 * Evaluate a spoken answer using Gemini AI (with retry for 429 rate limits)
 */
/*
 * ==========================================
 * OLD GEMINI DIRECT SDK EVALUATION (BACKUP)
 * ==========================================
 *
 * async function evaluateSpokenAnswer(question, transcript, expectedPoints, sampleAnswer) {
 *   if (!genAI || !transcript || transcript.trim().length === 0) {
 *     return {
 *       score: 0,
 *       maxScore: question.marks || 5,
 *       feedback: transcript
 *         ? "Evaluation service unavailable. Please ensure GEMINI_API_KEY is configured."
 *         : "No transcript available. Please ensure your microphone is working and speak clearly.",
 *       keyPointsCovered: [],
 *     };
 *   }
 * 
 *   const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
 * 
 *   const prompt = `You are an expert technical interviewer evaluating a student's spoken answer.
 * 
 * QUESTION: "${question.question}"
 * 
 * STUDENT'S ANSWER (transcribed): "${transcript}"
 * 
 * EXPECTED KEY POINTS: ${expectedPoints && expectedPoints.length > 0 ? expectedPoints.join(", ") : "General understanding of the topic"}
 * 
 * REFERENCE ANSWER: ${sampleAnswer || "Not provided — use your expertise."}
 * 
 * EVALUATION CRITERIA:
 * 1. Correctness — Is the answer factually accurate?
 * 2. Completeness — Does it cover the key points?
 * 3. Clarity — Is the explanation clear and well-structured?
 * 4. Depth — Does it show deeper understanding beyond surface-level?
 * 
 * RESPOND IN THIS EXACT JSON FORMAT ONLY (no markdown, no extra text):
 * {
 *   "score": <number 0 to ${question.marks || 5}>,
 *   "feedback": "<2-3 sentence constructive feedback>",
 *   "keyPointsCovered": ["<point1>", "<point2>"],
 *   "keyPointsMissed": ["<point1>"],
 *   "correctness": "<brief note>",
 *   "suggestion": "<one improvement suggestion>"
 * }`;
 * 
 *   // Retry logic for Gemini API rate limits (429 errors)
 *   let lastError = null;
 *   for (let attempt = 1; attempt <= 3; attempt++) {
 *     try {
 *       const result = await model.generateContent(prompt);
 *       const responseText = result.response.text().trim();
 * 
 *       // Parse JSON from response (handle potential markdown wrapping)
 *       let jsonStr = responseText;
 *       if (jsonStr.startsWith("```")) {
 *         jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
 *       }
 * 
 *       const evaluation = JSON.parse(jsonStr);
 * 
 *       return {
 *         score: Math.min(evaluation.score || 0, question.marks || 5),
 *         maxScore: question.marks || 5,
 *         feedback: evaluation.feedback || "Answer evaluated.",
 *         keyPointsCovered: evaluation.keyPointsCovered || [],
 *         keyPointsMissed: evaluation.keyPointsMissed || [],
 *         correctness: evaluation.correctness || "",
 *         suggestion: evaluation.suggestion || "",
 *       };
 *     } catch (error) {
 *       lastError = error;
 *       console.error(`Gemini evaluation error (attempt ${attempt}/3):`, error.message);
 * 
 *       // If rate limited (429), wait and retry
 *       if (error.message && error.message.includes("429") && attempt < 3) {
 *         const waitSec = 30 * attempt; // 30s, 60s
 *         console.log(`⏳ Rate limited. Waiting ${waitSec}s before retry...`);
 *         await new Promise((r) => setTimeout(r, waitSec * 1000));
 *         continue;
 *       }
 *       break; // Non-429 error or last attempt — stop retrying
 *     }
 *   }
 * 
 *   // All retries failed
 *   return {
 *     score: 0,
 *     maxScore: question.marks || 5,
 *     feedback: `Evaluation error: ${lastError ? lastError.message : "Unknown error"}. Your answer has been saved.`,
 *     keyPointsCovered: [],
 *   };
 * }
 */

/**
 * Evaluate a spoken answer using FastAPI AI endpoints (Rubric + Evaluator)
 * Uses the same pipeline as the exam evaluation with cached rubrics.
 */
async function evaluateSpokenAnswer(question, transcript, expectedPoints, sampleAnswer) {
  const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
  const qId = question._id ? question._id.toString() : "test-question-id";

  if (!transcript || !transcript.trim()) {
    return {
      score: 0,
      maxScore: question.marks || 5,
      feedback: "No answer provided.",
      keyPointsCovered: [],
      keyPointsMissed: expectedPoints || [],
      correctness: "No answer",
      suggestion: "Please try to record a spoken answer next time."
    };
  }

  // 1) Retrieve rubric if cached, otherwise generate via FastAPI
  let rubric = [];
  let questionDoc = null;

  try {
    questionDoc = await PracticeQuestion.findById(question._id);
    if (questionDoc && questionDoc.rubricGenerated && questionDoc.rubricData && Array.isArray(questionDoc.rubricData.rubrics)) {
      console.log(`[Practice Evaluation] Reusing cached rubric for question ${qId}`);
      rubric = questionDoc.rubricData.rubrics;
    }
  } catch (e) {
    console.error(`[Practice Evaluation] Failed to load cached rubric for question ${qId}:`, e.message);
  }

  if (rubric.length === 0) {
    console.log(`[Practice Evaluation] Generating rubric from FastAPI for question ${qId}...`);
    try {
      const rubricRes = await axios.post(`${aiServiceUrl}/api/v1/rubrics/create`, {
        question_id: qId,
        question_text: question.question,
        max_marks: Math.round(question.marks || 5),
      }, { timeout: 10000 }); // Fast timeout of 10s

      if (rubricRes.data && Array.isArray(rubricRes.data.rubrics)) {
        rubric = rubricRes.data.rubrics;
        
        // Cache rubric in MongoDB PracticeQuestion document
        if (questionDoc) {
          questionDoc.rubricGenerated = true;
          questionDoc.rubricData = { rubrics: rubric };
          await questionDoc.save();
          console.log(`[Practice Evaluation] Successfully cached rubric in DB for question ${qId}`);
        }
      } else {
        throw new Error("Invalid rubric format received from AI service");
      }
    } catch (err) {
      console.error(`[Practice Evaluation] Rubric creation failed for question ${qId}:`, err.message);
      throw new Error(`Rubric creation failed: ${err.message}`);
    }
  }

  // 2) Call FastAPI evaluate/answer endpoint
  console.log(`[Practice Evaluation] Calling FastAPI evaluate/answer for question ${qId}...`);
  try {
    const evalRes = await axios.post(`${aiServiceUrl}/api/v1/evaluate/answer`, {
      question_id: qId,
      question_text: question.question,
      student_answer: transcript,
      rubric: rubric,
      max_marks: question.marks || 5,
    }, { timeout: 15000 }); // Fast timeout of 15s

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
        score: Math.min(score || 0, question.marks || 5),
        maxScore: question.marks || 5,
        feedback: feedbackParts.join("\n\n"),
        keyPointsCovered: Array.isArray(strengths) ? strengths : [],
        keyPointsMissed: Array.isArray(weakness) ? weakness : [],
        correctness: justification || "",
        suggestion: suggested_improvement || "",
      };
    } else {
      throw new Error("Invalid evaluation format received from AI service");
    }
  } catch (err) {
    console.error(`[Practice Evaluation] Answer evaluation failed for question ${qId}:`, err.message);
    throw new Error(`Answer evaluation failed: ${err.message}`);
  }
}


/**
 * Evaluate and complete a practice session
 */
async function evaluateSession(sessionId, studentId) {
  const session = await PracticeSession.findOne({
    _id: sessionId,
    studentId,
  }).populate("questions");

  if (!session) {
    throw new Error("Session not found");
  }

  if (session.status === "completed") {
    return {
      sessionId: session._id,
      score: session.score,
      totalMarks: session.totalMarks,
      accuracy: session.accuracy,
      answers: session.answers,
      questions: session.questions,
    };
  }

  let totalScore = 0;
  let totalMarks = 0;
  let correctCount = 0;
  let attemptedCount = 0;

  // === PHASE 1: Evaluate MCQ answers (instant) ===
  for (let i = 0; i < session.answers.length; i++) {
    const answer = session.answers[i];
    const question = session.questions.find(
      (q) => q._id.toString() === answer.questionId.toString()
    );

    if (!question) continue;
    totalMarks += question.marks || 1;

    if (
      question.category === "aptitude" ||
      question.category === "technical_mcq"
    ) {
      if (answer.selectedOption !== null && answer.selectedOption !== undefined) {
        attemptedCount++;
        const isCorrect = answer.selectedOption === question.correctAnswer;
        const marksAwarded = isCorrect ? (question.marks || 1) : 0;

        answer.isCorrect = isCorrect;
        answer.marksAwarded = marksAwarded;
        answer.explanation = question.explanation || "";

        if (isCorrect) {
          correctCount++;
          totalScore += marksAwarded;
        }
      } else {
        answer.isCorrect = false;
        answer.marksAwarded = 0;
        answer.explanation = question.explanation || "";
      }
    }
  }

  // === PHASE 2: Parallel STT for all spoken questions ===
  const spokenItems = [];
  for (let i = 0; i < session.answers.length; i++) {
    const answer = session.answers[i];
    const question = session.questions.find(
      (q) => q._id.toString() === answer.questionId.toString()
    );
    if (question && question.category === "technical_spoken" && (answer.audioData || answer.transcript)) {
      spokenItems.push({ answer, question, index: i });
    }
  }

  if (spokenItems.length > 0) {
    // Run ALL STT transcriptions in parallel
    console.log(`🎤 Running STT for ${spokenItems.length} spoken questions in parallel...`);
    const sttPromises = spokenItems.map(async ({ answer, question }) => {
      if (!answer.audioData) return answer.transcript || "";
      try {
        const sttText = await transcribeBase64Audio(answer.audioData);
        if (sttText && sttText.trim().length > 0) {
          answer.transcript = sttText;
          console.log(`✅ STT [${question._id}]: "${sttText.substring(0, 60)}..."`);
          return sttText;
        }
      } catch (e) {
        console.error(`⚠️ STT failed [${question._id}]:`, e.message);
      }
      return answer.transcript || "";
    });

    const transcripts = await Promise.allSettled(sttPromises);

    // === PHASE 3: Parallel Gemini evaluation (2 at a time to avoid rate limits) ===
    console.log(`🧠 Evaluating ${spokenItems.length} spoken answers with Gemini AI...`);
    const BATCH_SIZE = 2;
    for (let b = 0; b < spokenItems.length; b += BATCH_SIZE) {
      const batch = spokenItems.slice(b, b + BATCH_SIZE);
      const evalPromises = batch.map(async ({ answer, question }, bIdx) => {
        const tResult = transcripts[b + bIdx];
        const finalTranscript = tResult.status === "fulfilled" ? tResult.value : (answer.transcript || "");
        attemptedCount++;

        const evaluation = await evaluateSpokenAnswer(
          question,
          finalTranscript,
          question.expectedPoints,
          question.sampleAnswer
        );

        answer.spokenScore = evaluation.score;
        answer.spokenFeedback = evaluation.feedback;
        answer.keyPointsCovered = evaluation.keyPointsCovered || [];
        answer.marksAwarded = evaluation.score;
        answer.isCorrect = evaluation.score >= (question.marks || 5) * 0.5;
        answer.explanation = evaluation.suggestion || "";

        totalScore += evaluation.score;
        if (answer.isCorrect) correctCount++;
      });
      
      const evalResults = await Promise.allSettled(evalPromises);
      // Propagate error if any evaluation fails so that the user gets a retry option
      for (const res of evalResults) {
        if (res.status === "rejected") {
          console.error("Practice AI evaluation promise rejected:", res.reason);
          throw new Error(res.reason?.message || "AI Evaluation failed. Please try again later.");
        }
      }
    }
  }

  // Handle unanswered spoken questions
  for (const { answer, question } of spokenItems.length === 0 ? [] : []) {
    // Already handled above
  }
  for (let i = 0; i < session.answers.length; i++) {
    const answer = session.answers[i];
    const question = session.questions.find(
      (q) => q._id.toString() === answer.questionId.toString()
    );
    if (question && question.category === "technical_spoken" && !answer.audioData && !answer.transcript) {
      totalMarks += 0; // already counted
      answer.spokenScore = 0;
      answer.spokenFeedback = "No answer recorded.";
      answer.marksAwarded = 0;
      answer.isCorrect = false;
    }
  }

  // Update session with results
  session.score = totalScore;
  session.totalMarks = totalMarks;
  session.accuracy =
    attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;
  session.status = "completed";
  session.completedAt = new Date();

  await session.save();

  return {
    sessionId: session._id,
    type: session.type,
    topic: session.topic,
    score: totalScore,
    totalMarks,
    accuracy: session.accuracy,
    correctCount,
    attemptedCount,
    totalQuestions: session.questions.length,
    answers: session.answers,
    questions: session.questions,
  };
}

module.exports = {
  evaluateSpokenAnswer,
  evaluateSession,
};
