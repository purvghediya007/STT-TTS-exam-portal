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

    // Upsert each problem (update if exists, insert if not)
    let inserted = 0;
    let updated = 0;

    for (const problem of problems) {
      const existing = await CodingProblem.findOne({ slug: problem.slug });
      if (existing) {
        await CodingProblem.updateOne({ slug: problem.slug }, { $set: problem });
        updated++;
        console.log(`  Updated: ${problem.title}`);
      } else {
        await CodingProblem.create(problem);
        inserted++;
        console.log(`  Inserted: ${problem.title}`);
      }
    }

    console.log(`\nDone! Inserted: ${inserted}, Updated: ${updated}, Total: ${problems.length}`);
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
}

seed();
