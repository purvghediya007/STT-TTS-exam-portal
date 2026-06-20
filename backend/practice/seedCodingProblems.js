// backend/practice/seedCodingProblems.js
// Run: node backend/practice/seedCodingProblems.js
// Loads coding problems from JSON into MongoDB

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });


const CodingProblem = require("./models/CodingProblem");
const problems = require("./data/coding_problems.json");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/examecho";

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // Clear all existing coding problems first to ensure only the 5 premium ones exist
    await CodingProblem.deleteMany({});
    console.log("Cleared existing coding problems from database");

    let inserted = 0;
    for (const problem of problems) {
      await CodingProblem.create(problem);
      inserted++;
      console.log(`  Inserted: ${problem.title}`);
    }

    console.log(`\nDone! Successfully seeded only the 5 premium LeetCode-style questions.`);
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
}

seed();
