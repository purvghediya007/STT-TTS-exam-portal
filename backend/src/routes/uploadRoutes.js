const express = require("express");
const fs = require("fs");
const path = require("path");
const authMiddleware = require("../middleware/authMiddleware");
const {
  upload,
  deleteFromCloudinary,
} = require("../services/cloudinaryService");

// Modified: Added imports for File / Excel Upload parsing
const xlsx = require("xlsx");
const pdfParse = require("pdf-parse");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const multer = require("multer");
const uploadMemory = multer({ storage: multer.memoryStorage() });

const router = express.Router();


/**
 * POST /api/upload/media
 * Upload media (image, video, document) to Cloudinary
 * Requires: authMiddleware
 * Body: form-data with file
 * Returns: { url: 'cloudinary_url', public_id: 'cloudinary_id' }
 */
router.post("/media", authMiddleware, upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file provided" });
    }

    console.log("Uploaded file object:", JSON.stringify(req.file, null, 2));

    // Return Cloudinary URL and public ID
    // multer-storage-cloudinary stores URL in 'path' and public_id in 'filename'
    res.json({
      success: true,
      url: req.file.path,
      public_id: req.file.filename,
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({
      message: "Error uploading file",
      error: error.message,
    });
  }
});

/**
 * DELETE /api/upload/media/:publicId
 * Delete media from Cloudinary
 * Requires: authMiddleware
 * Params: publicId (Cloudinary public ID)
 */
router.delete("/media/:publicId", authMiddleware, async (req, res) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({ message: "Public ID is required" });
    }

    // Decode the public ID if it's URL encoded
    const decodedPublicId = decodeURIComponent(publicId);

    await deleteFromCloudinary(decodedPublicId);

    res.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({
      message: "Error deleting file",
      error: error.message,
    });
  }
});

// GET /api/upload/download?p=/uploads/answers/....
// LEGACY ENDPOINT: For downloading old local audio files only
// New audio uploads go directly to S3 - see /api/student/exams/:examId/s3-presigned-url
// Securely stream a file from the uploads directory with Content-Disposition to force download.
router.get("/download", async (req, res) => {
  try {
    const p = req.query.p || req.query.path;
    if (!p || typeof p !== "string")
      return res
        .status(400)
        .json({ message: "path (p) query param is required" });

    // Only allow downloads from the uploads/answers folder for legacy files
    if (!p.startsWith("/uploads/answers/"))
      return res
        .status(400)
        .json({
          message:
            "invalid path - only legacy /uploads/answers/ paths supported",
        });

    const uploadsRoot = path.join(__dirname, "..", "uploads");
    const relative = p.replace(/^\/uploads\/?/, "");
    const abs = path.join(uploadsRoot, relative);

    // Prevent path traversal
    if (!abs.startsWith(uploadsRoot))
      return res.status(400).json({ message: "invalid path" });
    if (!fs.existsSync(abs))
      return res.status(404).json({ message: "file not found" });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${path.basename(abs)}"`,
    );
    return res.sendFile(abs);
  } catch (err) {
    console.error("Download endpoint error", err);
    return res.status(500).json({ message: "internal error" });
  }
});

// Modified: Added POST /api/upload/parse-questions route to parse PDF, Excel, and CSV question banks
router.post(
  "/parse-questions",
  authMiddleware,
  uploadMemory.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }

      console.log(`[Upload] Parsing questions from file: ${req.file.originalname}, size: ${req.file.size} bytes`);
      const fileBuffer = req.file.buffer;
      const fileExt = path.extname(req.file.originalname).toLowerCase();
      let parsedQuestions = [];

      if (fileExt === ".xlsx" || fileExt === ".xls" || fileExt === ".csv") {
        try {
          const workbook = xlsx.read(fileBuffer, { type: "buffer" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rawRows = xlsx.utils.sheet_to_json(worksheet);

          console.log(`[Upload] Excel sheets parsed, found ${rawRows.length} raw rows`);

          // Attempt direct JavaScript parsing
          parsedQuestions = parseExcelRows(rawRows);

          // Fallback to Gemini if direct parsing yields no questions (unstructured Excel/CSV)
          if (parsedQuestions.length === 0 && rawRows.length > 0) {
            console.log(`[Upload] Direct Excel parsing found 0 questions. Falling back to Gemini parsing.`);
            const sheetText = rawRows.map(row => JSON.stringify(row)).join("\n");
            parsedQuestions = await parseUnstructuredTextWithGemini(sheetText);
          }
        } catch (excelErr) {
          console.error("Error parsing Excel/CSV file:", excelErr);
          return res.status(400).json({ message: "Failed to parse Excel/CSV file", error: excelErr.message });
        }
      } else if (fileExt === ".pdf") {
        try {
          // Parse PDF text supporting both traditional function and modern class versions of pdf-parse
          let pdfText = "";
          /* Old single-function parsing (failed because installed pdf-parse exports a class object, not a function):
          const pdfData = await pdfParse(fileBuffer);
          pdfText = pdfData.text || "";
          */
          if (typeof pdfParse === "function") {
            // Traditional pdf-parse library
            const pdfData = await pdfParse(fileBuffer);
            pdfText = pdfData.text || "";
          } else if (pdfParse && typeof pdfParse.PDFParse === "function") {
            // Modern TypeScript-based pdf-parse library (mehmet-kozan/pdf-parse)
            const parser = new pdfParse.PDFParse({ data: fileBuffer });
            const textResult = await parser.getText();
            pdfText = textResult.text || "";
          } else {
            throw new Error("PDF parser is not supported or not initialized correctly.");
          }

          console.log(`[Upload] PDF parsed successfully, extracted ${pdfText.length} characters of text`);

          if (!pdfText.trim()) {
            return res.status(400).json({ message: "The uploaded PDF has no extractable text." });
          }

          // Use Gemini to structure PDF questions
          parsedQuestions = await parseUnstructuredTextWithGemini(pdfText);
        } catch (pdfErr) {
          console.error("Error parsing PDF file:", pdfErr);
          return res.status(400).json({ message: "Failed to parse PDF file", error: pdfErr.message });
        }
      } else {
        return res.status(400).json({ message: "Unsupported file format. Please upload PDF, Excel, or CSV." });
      }

      console.log(`[Upload] Successfully parsed ${parsedQuestions.length} questions`);
      return res.status(200).json({
        success: true,
        questions: parsedQuestions
      });
    } catch (error) {
      console.error("Error in parse-questions route:", error);
      next(error);
    }
  }
);

// Helper function to parse Excel rows directly
function parseExcelRows(rawRows) {
  const parsedQuestions = [];

  for (const row of rawRows) {
    const getValue = (keys) => {
      for (const k of Object.keys(row)) {
        const cleaned = k.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (keys.includes(cleaned)) {
          return row[k];
        }
      }
      return undefined;
    };

    const text = getValue(["question", "text", "questiontext", "prompt", "q"]);
    if (!text) continue;

    let type = getValue(["type", "questiontype"]);
    if (type) {
      type = type.toString().toLowerCase().trim();
      if (!["mcq", "viva", "interview"].includes(type)) {
        type = "viva";
      }
    } else {
      type = "viva";
    }

    let marks = getValue(["marks", "points"]);
    marks = marks ? parseInt(marks) || 1 : 1;

    const expectedAnswer = getValue(["expectedanswer", "answer", "explanation", "ans"]) || "";

    const q = {
      id: `PQ${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      text: text.toString().trim(),
      type,
      marks,
      expectedAnswer: expectedAnswer.toString().trim(),
      options: []
    };

    if (type === "mcq") {
      const optA = getValue(["option1", "optiona", "opt1", "opta", "a", "optiona"]) || "";
      const optB = getValue(["option2", "optionb", "opt2", "optb", "b", "optionb"]) || "";
      const optC = getValue(["option3", "optionc", "opt3", "optc", "c", "optionc"]) || "";
      const optD = getValue(["option4", "optiond", "opt4", "optd", "d", "optiond"]) || "";

      const correctVal = getValue(["correctoption", "correctanswer", "correct", "key", "correcta"]) || "";
      const correctStr = correctVal.toString().trim().toUpperCase();

      const rawOpts = [optA, optB, optC, optD].filter(o => o.toString().trim());
      if (rawOpts.length >= 2) {
        q.options = rawOpts.map((textVal, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const numStr = (idx + 1).toString();
          const isCorrect = correctStr === letter || correctStr === numStr || correctStr.includes(textVal.toString().trim().toUpperCase());
          return {
            text: textVal.toString().trim(),
            isCorrect
          };
        });

        if (!q.options.some(o => o.isCorrect)) {
          q.options[0].isCorrect = true;
        }
      } else {
        q.type = "viva";
      }
    }

    parsedQuestions.push(q);
  }

  return parsedQuestions;
}

// Helper function to call Gemini to parse unstructured text
async function parseUnstructuredTextWithGemini(extractedText) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("⚠ GEMINI_API_KEY not set — Gemini parsing disabled.");
    throw new Error("Gemini API key is not configured on the server");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.AI_MODEL || "gemini-2.5-flash";
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = `You are an AI assistant designed to parse question banks and extract exam questions.
Extract all questions from the text below and return them strictly as a JSON array of objects.
Each object in the array must follow this exact format:
{
  "text": "Question prompt text...",
  "type": "mcq" | "viva" | "interview",
  "marks": number (points/marks, default to 1 if not specified),
  "expectedAnswer": "Rubric or correct answer...",
  "options": [ // Only if type is "mcq"
    { "text": "Option A text...", "isCorrect": true },
    { "text": "Option B text...", "isCorrect": false },
    ...
  ]
}

Ensure that:
1. For MCQ questions, there are 2 to 4 options, and exactly one is marked as isCorrect: true.
2. Viva questions expect a spoken answer (default type if not specified).
3. Interview questions are interview style questions.
4. Do not include any markdown formatting, backticks, or text before/after the JSON. Just return the raw JSON array.

Text to parse:
${extractedText}`;

  const result = await model.generateContent(prompt);
  let responseText = result.response.text() || "";
  responseText = responseText.trim();

  // Strip markdown fences if present
  if (responseText.startsWith("```")) {
    const match = responseText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (match && match[1]) {
      responseText = match[1].trim();
    }
  }

  try {
    const questions = JSON.parse(responseText);
    if (!Array.isArray(questions)) {
      throw new Error("Gemini returned invalid questions format");
    }

    // Assign temporary IDs and clean up format
    return questions.map(q => ({
      id: `PQ${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      text: q.text || "",
      type: ["mcq", "viva", "interview"].includes(q.type) ? q.type : "viva",
      marks: q.marks || 1,
      expectedAnswer: q.expectedAnswer || "",
      options: q.type === "mcq" && Array.isArray(q.options) ? q.options : []
    }));
  } catch (err) {
    console.error("Failed to parse JSON response from Gemini:", responseText);
    throw new Error("Failed to structure the question bank text using AI");
  }
}

module.exports = router;
