// seedPracticeData.js — Run: node backend/practice/seedPracticeData.js
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const PracticeQuestion = require("./models/PracticeQuestion");
const { generateTTSForAllSpokenQuestions } = require("./services/ttsService");

const connectDB = require("../src/config/db");

async function seed() {
  await connectDB();
  console.log("Connected to MongoDB. Seeding practice data...");

  // Clear existing practice questions
  await PracticeQuestion.deleteMany({});
  console.log("Cleared existing practice questions.");

  const allQuestions = [
    ...require("./data/aptitude_numbers.json"),
    ...require("./data/aptitude_ages.json"),
    ...require("./data/aptitude_profit_loss.json"),
    ...require("./data/aptitude_tsd.json"),
    ...require("./data/aptitude_averages.json"),
    ...require("./data/aptitude_percentages.json"),
    ...require("./data/aptitude_ratio.json"),
    ...require("./data/aptitude_interest.json"),
    ...require("./data/technical_mcq.json"),
    ...require("./data/spoken_questions.json"),
    // Company-wise questions (NEW)
    ...require("./data/company_aptitude.json"),
    ...require("./data/company_technical.json"),
  ];

  const result = await PracticeQuestion.insertMany(allQuestions);
  console.log(`Inserted ${result.length} practice questions.`);

  // Summary by category
  const categorySummary = await PracticeQuestion.aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  console.log("\nCategory Summary:");
  categorySummary.forEach((s) => console.log(`  ${s._id}: ${s.count} questions`));

  // Summary by topic
  const topicSummary = await PracticeQuestion.aggregate([
    { $group: { _id: { category: "$category", topic: "$topic" }, count: { $sum: 1 } } },
    { $sort: { "_id.category": 1, "_id.topic": 1 } },
  ]);
  console.log("\nTopic Summary:");
  topicSummary.forEach((s) => console.log(`  ${s._id.category} / ${s._id.topic}: ${s.count}`));

  // Company summary
  const companySummary = await PracticeQuestion.aggregate([
    { $unwind: "$companies" },
    { $group: { _id: "$companies", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  if (companySummary.length > 0) {
    console.log("\nCompany Summary:");
    companySummary.forEach((s) => console.log(`  ${s._id}: ${s.count} questions`));
  }

  // === Auto-generate TTS audio for spoken questions ===
  console.log("\n🎧 Starting TTS generation for spoken questions...");
  console.log("   Each question takes ~3 seconds due to API throttling\n");

  try {
    const ttsResult = await generateTTSForAllSpokenQuestions(PracticeQuestion);
    console.log(`\n🎧 TTS Results: ${ttsResult.successCount} generated, ${ttsResult.failCount} failed`);
  } catch (ttsError) {
    console.error("⚠️ TTS generation encountered errors:", ttsError.message);
    console.log("   Questions seeded successfully. TTS can be generated later.");
  }

  await mongoose.disconnect();
  console.log("\n✅ Seeding complete!");
}

seed().catch((e) => { console.error(e); process.exit(1); });
