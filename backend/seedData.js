/**
 * seedData.js - Seed database with dummy data
 * Run this file to populate the database with sample exams and questions
 * Usage: node seedData.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Import models
const Teacher = require("./src/models/Teacher");
const Student = require("./src/models/Student");
const Exam = require("./src/models/Exam");
const Question = require("./src/models/Question");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/exam-portal";

async function seedDatabase() {
  try {
    // Connect to MongoDB
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Faculty data (Deep Admin)
    const facultyData = {
      _id: new mongoose.Types.ObjectId("693664a7ba5c1c3f54c67d77"),
      email: "dp11700@gmail.com",
      username: "deep admin",
      passwordHash:
        "$2b$10$5YYqR6aN0YAN069F4NDSseL7Vg6jJ7fu9mkddfCx/c00GOGhwy/p.",
      role: "teacher",
      createdAt: new Date("2025-12-08T05:39:51.673Z"),
    };

    // Check if faculty already exists
    let faculty = await Teacher.findOne({ email: facultyData.email });
    if (!faculty) {
      console.log("Creating faculty member...");
      faculty = await Teacher.create(facultyData);
      console.log("✅ Faculty created:", faculty.username);
    } else {
      console.log("ℹ️  Faculty already exists:", faculty.username);
    }

    // Create dummy students
    console.log("\nCreating dummy students...");

    // Generate a password hash for all students (password: "student123")
    const passwordHash = await bcrypt.hash("student123", 10);

    const studentsData = [
      {
        username: "student_001",
        email: "student001@example.com",
        enrollmentNumber: "230170116001",
        role: "student",
        passwordHash,
      },
      {
        username: "student_002",
        email: "student002@example.com",
        enrollmentNumber: "230170116002",
        role: "student",
        passwordHash,
      },
      {
        username: "student_003",
        email: "student003@example.com",
        enrollmentNumber: "230170116003",
        role: "student",
        passwordHash,
      },
      {
        username: "student_004",
        email: "student004@example.com",
        enrollmentNumber: "230170116004",
        role: "student",
        passwordHash,
      },
      {
        username: "student_005",
        email: "student005@example.com",
        enrollmentNumber: "230170116005",
        role: "student",
        passwordHash,
      },
      {
        username: "student_006",
        email: "student006@example.com",
        enrollmentNumber: "230170116006",
        role: "student",
        passwordHash,
      },
      {
        username: "student_007",
        email: "student007@example.com",
        enrollmentNumber: "230170116007",
        role: "student",
        passwordHash,
      },
      {
        username: "student_008",
        email: "student008@example.com",
        enrollmentNumber: "230170116008",
        role: "student",
        passwordHash,
      },
      {
        username: "student_009",
        email: "student009@example.com",
        enrollmentNumber: "230170116009",
        role: "student",
        passwordHash,
      },
      {
        username: "student_010",
        email: "student010@example.com",
        enrollmentNumber: "230170116010",
        role: "student",
        passwordHash,
      },
    ];

    let createdStudents = 0;
    for (const studentData of studentsData) {
      const existingStudent = await Student.findOne({
        email: studentData.email,
      });
      if (!existingStudent) {
        const student = await Student.create(studentData);
        console.log(
          `✅ Created student: ${student.username} (${student.enrollmentNumber})`
        );
        createdStudents++;
      } else {
        console.log(
          `ℹ️  Student already exists: ${existingStudent.username} (${existingStudent.enrollmentNumber})`
        );
      }
    }
    console.log(`\nTotal students created: ${createdStudents}`);

    // Exam data
    const examsData = [
      {
        title: "Data Structures & Algorithms",
        description:
          "Comprehensive exam covering fundamental data structures and algorithms",
        examCode: "DSA101",
        teacherId: faculty._id,
        status: "published",
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        durationMinutes: 120,
        settings: {
          thinkTimeSeconds: 15,
          answerTimeSeconds: 90,
          reRecordAllowed: 2,
          ttsVoice: "en_us_female",
        },
      },
      {
        title: "Web Development Fundamentals",
        description: "Assessment of HTML, CSS, and JavaScript fundamentals",
        examCode: "WEB201",
        teacherId: faculty._id,
        status: "published",
        startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        durationMinutes: 90,
        settings: {
          thinkTimeSeconds: 10,
          answerTimeSeconds: 60,
          reRecordAllowed: 1,
          ttsVoice: "en_us_male",
        },
      },
      {
        title: "Database Management Systems",
        description: "DBMS concepts, SQL, and database design",
        examCode: "DBMS301",
        teacherId: faculty._id,
        status: "published",
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
        durationMinutes: 100,
        settings: {
          thinkTimeSeconds: 20,
          answerTimeSeconds: 120,
          reRecordAllowed: 2,
          ttsVoice: "en_us_female",
        },
      },
      {
        title: "Object-Oriented Programming",
        description:
          "OOP concepts: classes, inheritance, polymorphism, abstraction",
        examCode: "OOP401",
        teacherId: faculty._id,
        status: "draft",
        startTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
        durationMinutes: 110,
        settings: {
          thinkTimeSeconds: 15,
          answerTimeSeconds: 90,
          reRecordAllowed: 2,
          ttsVoice: "en_us_female",
        },
      },
    ];

    // Question data
    const questionsData = [
      // DSA101 questions
      {
        examCode: "DSA101",
        questions: [
          {
            order: 1,
            text: "Explain the difference between a stack and a queue. Provide examples where each would be used.",
            type: "long_answer",
            marks: 10,
            expectedAnswer:
              "Stack follows LIFO (Last-In-First-Out) principle, used in undo/redo. Queue follows FIFO (First-In-First-Out) principle, used in scheduling.",
            instruction: "Provide at least 2 examples for each data structure.",
          },
          {
            order: 2,
            text: "Write a recursive function to calculate the factorial of a number. Explain the time complexity.",
            type: "long_answer",
            marks: 15,
            expectedAnswer:
              "Recursive function with base case n=1 returning 1. Time complexity O(n). Space complexity O(n) due to recursion stack.",
            instruction:
              "Include pseudocode or actual code. Discuss base case and recursive case.",
          },
          {
            order: 3,
            text: "Describe the binary search algorithm. When can it be used effectively?",
            type: "long_answer",
            marks: 10,
            expectedAnswer:
              "Binary search works on sorted arrays. Divides search space by half each iteration. Time complexity O(log n). Used when data is sorted.",
            instruction: "Explain with an example on a sorted array.",
          },
          {
            order: 4,
            text: "What are hash tables? How do they handle collisions?",
            type: "long_answer",
            marks: 12,
            expectedAnswer:
              "Hash tables use hash functions to map keys to indices. Collisions handled by chaining or open addressing.",
            instruction:
              "Describe at least two collision resolution techniques.",
          },
          {
            order: 5,
            text: "Explain quicksort algorithm. What is its average and worst-case time complexity?",
            type: "long_answer",
            marks: 13,
            expectedAnswer:
              "Quicksort uses divide-and-conquer with pivot selection. Average O(n log n), worst case O(n²). In-place sorting.",
            instruction: "Include discussion on pivot selection strategies.",
          },
        ],
      },
      // WEB201 questions
      {
        examCode: "WEB201",
        questions: [
          {
            order: 1,
            text: "Explain semantic HTML and why it is important for web accessibility.",
            type: "long_answer",
            marks: 10,
            expectedAnswer:
              "Semantic HTML uses meaningful tags (like <header>, <article>, <section>) to convey meaning. Important for screen readers and SEO.",
            instruction: "Provide examples of semantic vs non-semantic HTML.",
          },
          {
            order: 2,
            text: "What is the CSS Box Model? Explain margin, border, padding, and content.",
            type: "long_answer",
            marks: 12,
            expectedAnswer:
              "Box Model consists of: content (inner), padding, border, margin (outer). Each has its own space and properties.",
            instruction: "Draw or describe the box model diagram.",
          },
          {
            order: 3,
            text: "Explain JavaScript closures with a practical example.",
            type: "long_answer",
            marks: 15,
            expectedAnswer:
              "Closure is a function that has access to variables from another function scope. Functions return functions that maintain access to parent scope.",
            instruction: "Provide working code example.",
          },
          {
            order: 4,
            text: "What are async/await in JavaScript? How do they differ from Promises?",
            type: "long_answer",
            marks: 13,
            expectedAnswer:
              "async/await is syntactic sugar over Promises for handling asynchronous operations. More readable than .then() chains.",
            instruction: "Compare with Promise examples.",
          },
        ],
      },
      // DBMS301 questions
      {
        examCode: "DBMS301",
        questions: [
          {
            order: 1,
            text: "Explain the ACID properties in database transactions. Why are they important?",
            type: "long_answer",
            marks: 12,
            expectedAnswer:
              "ACID: Atomicity (all or nothing), Consistency (valid state), Isolation (no interference), Durability (persistent). Ensures data integrity.",
            instruction: "Provide examples for each property.",
          },
          {
            order: 2,
            text: "What is database normalization? Describe the normal forms up to 3NF.",
            type: "long_answer",
            marks: 15,
            expectedAnswer:
              "1NF: atomic values only. 2NF: no partial dependencies. 3NF: no transitive dependencies. Reduces redundancy and improves data integrity.",
            instruction: "Use an example schema to explain each normal form.",
          },
          {
            order: 3,
            text: "Explain different types of SQL JOINs (INNER, LEFT, RIGHT, FULL). When to use each?",
            type: "long_answer",
            marks: 14,
            expectedAnswer:
              "INNER: common rows only. LEFT: all left rows + matching right. RIGHT: all right rows + matching left. FULL: all rows from both.",
            instruction: "Provide SQL examples for each join type.",
          },
          {
            order: 4,
            text: "What are indexes in databases? What are their advantages and disadvantages?",
            type: "long_answer",
            marks: 11,
            expectedAnswer:
              "Indexes speed up SELECT and WHERE queries. Disadvantages: slow down INSERT/UPDATE/DELETE, consume disk space.",
            instruction: "Discuss when to use indexes.",
          },
        ],
      },
      // OOP401 questions
      {
        examCode: "OOP401",
        questions: [
          {
            order: 1,
            text: "Explain the four pillars of Object-Oriented Programming.",
            type: "long_answer",
            marks: 12,
            expectedAnswer:
              "Encapsulation: bundling data and methods. Inheritance: deriving classes from parent. Polymorphism: many forms. Abstraction: hiding complexity.",
            instruction: "Provide code examples for each pillar.",
          },
          {
            order: 2,
            text: "What is the difference between composition and inheritance?",
            type: "long_answer",
            marks: 13,
            expectedAnswer:
              "Inheritance: IS-A relationship. Composition: HAS-A relationship. Composition is more flexible and preferred in many cases.",
            instruction: "Compare with code examples.",
          },
        ],
      },
    ];

    // Clear existing exams and questions (optional - remove if you want to keep old data)
    console.log("\nClearing existing exams and questions...");
    await Exam.deleteMany({ teacherId: faculty._id });
    await Question.deleteMany({ teacherId: faculty._id });
    console.log("✅ Cleared old data");

    // Create exams
    console.log("\nCreating exams...");
    const createdExams = [];
    for (const examData of examsData) {
      const exam = await Exam.create(examData);
      createdExams.push(exam);
      console.log(`✅ Created exam: ${exam.title} (${exam.examCode})`);
    }

    // Create questions
    console.log("\nCreating questions...");
    for (const examQuestions of questionsData) {
      const exam = createdExams.find(
        (e) => e.examCode === examQuestions.examCode
      );
      if (exam) {
        for (const questionData of examQuestions.questions) {
          const question = await Question.create({
            examId: exam._id,
            teacherId: faculty._id,
            ...questionData,
          });
          console.log(
            `✅ Created question: ${question.text.substring(0, 50)}...`
          );
        }
        console.log(
          `   Total questions for ${exam.examCode}: ${examQuestions.questions.length}`
        );
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Database seeding completed successfully!");
    console.log("=".repeat(60));
    console.log("\nSummary:");
    console.log(`  Faculty: ${faculty.username} (${faculty.email})`);
    console.log(`  Students created: ${createdStudents}`);
    console.log(`  Exams created: ${createdExams.length}`);
    console.log(
      `  Total questions: ${questionsData.reduce(
        (sum, e) => sum + e.questions.length,
        0
      )}`
    );
    console.log("\nYou can now login as:");
    console.log(`  Faculty - Username: ${faculty.username}`);
    console.log(`  Faculty - Email: ${faculty.email}`);
    console.log(
      `\n  Students - Use any enrollment number 230170116001 to 230170116010`
    );
    console.log("=".repeat(60));

    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

// Run seeding
seedDatabase();
