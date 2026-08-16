/**
 * scripts/addFaculty.js
 *
 * Add one or more faculty (teacher) users to the database.
 * Usage:
 *   node scripts/addFaculty.js --file=./scripts/faculties.json
 *   node scripts/addFaculty.js --email=foo@x.com --username="Foo" --password=secret
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const fs = require("fs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const Teacher = require("../src/models/Teacher");

const MONGODB_URI = process.env.MONGO_URI;
function parseArgs() {
  const args = process.argv.slice(2);
  const map = {};
  for (const a of args) {
    if (!a.startsWith("--")) continue;
    const kv = a.slice(2).split("=");
    const key = kv[0];
    const val = kv.slice(1).join("=") || true;
    map[key] = val;
  }
  return map;
}

async function ensureConnection() {
  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

async function addFaculty(entry) {
  // Normalize fields
  const email = (entry.email || "").toLowerCase().trim();
  const username = (entry.username || "").toLowerCase().trim();
  if (!email || !username) {
    console.error("Missing required fields: email and username are required.");
    return null;
  }

  // Check existence by email OR username to avoid unique-index errors
  const existing = await Teacher.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    console.log(
      `ℹ️  Faculty already exists: ${existing.email} (${existing.username})`,
    );
    return existing;
  }

  // Password handling: accept `password` (plaintext) or `passwordHash`.
  let passwordHash = entry.passwordHash || null;
  if (!passwordHash) {
    const password = entry.password || "password123";
    passwordHash = await bcrypt.hash(password, 10);
  }

  // Build document
  const doc = {
    email,
    username,
    passwordHash,
    role: entry.role || "teacher",
    createdAt: entry.createdAt ? new Date(entry.createdAt) : new Date(),
    department: entry.department || "",
    designation: entry.designation || "",
    qualification: entry.qualification || "",
    profileImage: entry.profileImage || "",
    bio: entry.bio || "",
    phone: entry.phone || "",
  };

  if (entry._id) {
    try {
      doc._id = new mongoose.Types.ObjectId(entry._id);
    } catch (e) {
      console.warn("Invalid _id provided, ignoring.");
    }
  }

  const created = await Teacher.create(doc);
  console.log(`✅ Created faculty: ${created.username} (${created.email})`);
  return created;
}

async function main() {
  const args = parseArgs();
  try {
    console.log("Connecting to MongoDB...");
    await ensureConnection();
    console.log("✅ Connected to MongoDB");

    let entries = [];
    if (args.file) {
      const filePath = path.resolve(process.cwd(), args.file);
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
      }
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) entries = parsed;
      else entries = [parsed];
    } else if (args.email && args.username) {
      entries = [
        {
          email: args.email,
          username: args.username,
          password: args.password,
          department: args.department,
          designation: args.designation,
          qualification: args.qualification,
        },
      ];
    } else {
      // If no args provided, look for a default faculties file inside scripts/
      const defaultFiles = [
        path.resolve(process.cwd(), "./scripts/faculties.json"),
        path.resolve(process.cwd(), "./scripts/faculties.sample.json"),
      ];
      let found = null;
      for (const f of defaultFiles) {
        if (fs.existsSync(f)) {
          found = f;
          break;
        }
      }
      if (found) {
        const raw = fs.readFileSync(found, "utf8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) entries = parsed;
        else entries = [parsed];
        console.log(`Loaded faculty entries from ${found}`);
      } else {
        console.error(
          "Usage: node scripts/addFaculty.js --file=./scripts/faculties.json OR --email=... --username=... --password=...",
        );
        process.exit(1);
      }
    }

    let createdCount = 0;
    for (const e of entries) {
      const res = await addFaculty(e);
      if (res) createdCount++;
    }

    console.log(`\nTotal faculties added: ${createdCount}`);
    await mongoose.connection.close();
    console.log("✅ Database connection closed");
  } catch (err) {
    console.error("❌ Error adding faculties:", err);
    process.exit(1);
  }
}

main();
