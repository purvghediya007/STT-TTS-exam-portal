import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DB_PATH = path.join(__dirname, 'database.json');

// Middleware
app.use(cors());
// Increase body size limit to handle large media files (50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper function to read database
function readDB() {
  try {
    // Check if database file exists
    if (!fs.existsSync(DB_PATH)) {
      console.log('Database file not found, creating new one');
      const initialDB = { exams: [], facultyExams: [], students: [], submissions: [], draftExams: [] };
      writeDB(initialDB);
      return initialDB;
    }
    
    const data = fs.readFileSync(DB_PATH, 'utf8');
    const db = JSON.parse(data);
    
    // Ensure all required arrays exist
    if (!db.exams) db.exams = [];
    if (!db.facultyExams) db.facultyExams = [];
    if (!db.students) db.students = [];
    if (!db.submissions) db.submissions = [];
    if (!db.draftExams) db.draftExams = [];
    
    return db;
  } catch (error) {
    console.error('Error reading database:', error);
    return { exams: [], facultyExams: [], students: [], submissions: [], draftExams: [] };
  }
}

// Helper function to write database
function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing database:', error);
    return false;
  }
}

// Helper function to get exam status based on current time
function getExamStatus(exam) {
  try {
    if (!exam.startsAt || !exam.endsAt) {
      return exam.status || 'unknown';
    }
    
    const now = new Date();
    const starts = new Date(exam.startsAt);
    const ends = new Date(exam.endsAt);
    
    // Validate dates
    if (isNaN(starts.getTime()) || isNaN(ends.getTime())) {
      console.warn('Invalid dates for exam:', exam.id, exam.startsAt, exam.endsAt);
      return exam.status || 'unknown';
    }
    
    if (now < starts) return 'upcoming';
    if (now >= starts && now < ends) return 'live';
    return 'finished';
  } catch (error) {
    console.error('Error in getExamStatus:', error);
    return exam.status || 'unknown';
  }
}

// ==================== STUDENT ENDPOINTS ====================

// GET /api/student/exams
app.get('/api/student/exams', (req, res) => {
  try {
    console.log('GET /api/student/exams - Request received');
    const db = readDB();
    
    // Ensure exams array exists
    if (!db.exams) {
      console.log('No exams array found, initializing empty array');
      db.exams = [];
    }
    
    console.log(`Found ${db.exams.length} exams in database`);
    
    // Always recalculate status based on current time
    let exams = db.exams.map((exam, index) => {
      try {
        // Only recalculate if exam has valid dates
        if (exam.startsAt && exam.endsAt) {
          try {
            const status = getExamStatus(exam);
            return {
                  ...exam,
                  status: status
                };
          } catch (err) {
            console.error(`Error calculating status for exam ${exam.id || index}:`, err);
            return {
              ...exam,
              status: exam.status || 'unknown'
            };
          }
        }
        // Keep original status if dates are missing
        return {
          ...exam,
          status: exam.status || 'unknown'
        };
      } catch (err) {
        console.error(`Error processing exam at index ${index}:`, err);
        return {
              id: exam.id || `unknown-${index}`,
              title: exam.title || 'Unknown Exam',
              shortDescription: exam.shortDescription || '',
              status: 'unknown',
              startsAt: exam.startsAt || null,
              endsAt: exam.endsAt || null,
              durationMin: exam.durationMin || 0,
              timePerQuestionSec: exam.timePerQuestionSec || null,
              // Do not inject defaults here; preserve faculty-provided values or leave undefined
            attemptsLeft: exam.attemptsLeft !== undefined ? exam.attemptsLeft : (exam.settingsSummary?.attemptsLeft !== undefined ? exam.settingsSummary.attemptsLeft : undefined),
            allowedReRecords: exam.allowedReRecords !== undefined ? exam.allowedReRecords : (exam.settingsSummary?.allowedReRecords !== undefined ? exam.settingsSummary.allowedReRecords : undefined),
              teacherName: exam.teacherName || 'Unknown',
              pointsTotal: exam.pointsTotal || 0,
              thumbnailUrl: exam.thumbnailUrl || null,
              settingsSummary: exam.settingsSummary || {}
        };
      }
    });

    // Filter by status
    const status = req.query.status;
    if (status && status !== 'all') {
      // Map status filter to match our status values
      const statusMap = {
        'live': 'live',
        'available': 'live',
        'upcoming': 'upcoming',
        'finished': 'finished',
        'completed': 'finished'
      };
      const filterStatus = statusMap[status] || status;
      exams = exams.filter(e => e.status === filterStatus);
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedExams = exams.slice(startIndex, endIndex);

    console.log(`Returning ${paginatedExams.length} exams (page ${page}, limit ${limit})`);

    res.json({
      exams: paginatedExams,
      page,
      limit,
      total: exams.length
    });
  } catch (error) {
    console.error('Error in GET /api/student/exams:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message || 'Unknown error',
      exams: []
    });
  }
});

// GET /api/student/exams/:examId/summary
app.get('/api/student/exams/:examId/summary', (req, res) => {
  const db = readDB();
  const exam = db.exams.find(e => e.id === req.params.examId);
  
  if (!exam) {
    return res.status(404).json({ error: 'Exam not found' });
  }

  // Get questions from faculty exam if available
  const facultyExam = db.facultyExams.find(e => e.id === req.params.examId);
  const questions = facultyExam?.questions || exam.questions || [];

  res.json({
    id: exam.id,
    title: exam.title,
    instructions: exam.settingsSummary?.instructions || 'Read all questions carefully.',
    timePerQuestionSec: exam.timePerQuestionSec,
    durationMin: exam.durationMin,
    attemptsLeft: exam.attemptsLeft !== undefined ? exam.attemptsLeft : (exam.settingsSummary?.attemptsLeft !== undefined ? exam.settingsSummary.attemptsLeft : undefined),
    allowedReRecords: exam.allowedReRecords !== undefined ? exam.allowedReRecords : (exam.settingsSummary?.allowedReRecords !== undefined ? exam.settingsSummary.allowedReRecords : undefined),
    strictMode: exam.settingsSummary?.strictMode || false,
    otherSettings: exam.settingsSummary || {},
    questionsCount: questions.length,
    pointsTotal: exam.pointsTotal
  });
});

// GET /api/student/exams/:examId/questions
app.get('/api/student/exams/:examId/questions', (req, res) => {
  const db = readDB();
  const exam = db.exams.find(e => e.id === req.params.examId);
  
  if (!exam) {
    return res.status(404).json({ error: 'Exam not found' });
  }

  // Get questions from faculty exam
  const facultyExam = db.facultyExams.find(e => e.id === req.params.examId);
  let questions = facultyExam?.questions || exam.questions || [];

  console.log(`Found ${questions.length} questions for exam ${req.params.examId}`);
  console.log('Question types:', questions.map(q => ({ id: q.id, type: q.type })));

  // Remove correct answers and answer keys for students
  const studentQuestions = questions.map(q => {
    // Ensure question has required fields
    const baseQuestion = {
      id: q.id || `Q${Date.now()}-${Math.random()}`,
      type: q.type || 'viva',
      question: q.question || '',
      points: q.points || 1,
      media: q.media || null
    };

    if (q.type === 'mcq') {
      // Remove correctAnswer for MCQ, but keep options
      // eslint-disable-next-line no-unused-vars
      const { correctAnswer, answer, ...questionWithoutAnswer } = q;
      return {
        ...baseQuestion,
        ...questionWithoutAnswer,
        options: q.options || []
      };
    } else if (q.type === 'descriptive') {
      // Remove answer key for descriptive questions (faculty only)
      // Keep all other fields including media
      // eslint-disable-next-line no-unused-vars
      const { answer, correctAnswer, ...questionWithoutAnswer } = q;
      return {
        ...baseQuestion,
        ...questionWithoutAnswer
      };
    }
    // Fallback for unknown types
    return baseQuestion;
  });

  console.log(`Returning ${studentQuestions.length} questions to student`);

  res.json({
    questions: studentQuestions,
    totalQuestions: studentQuestions.length,
    pointsTotal: exam.pointsTotal
  });
});

// POST /api/student/exams/:examId/submit
app.post('/api/student/exams/:examId/submit', (req, res) => {
  const db = readDB();
  const exam = db.exams.find(e => e.id === req.params.examId);
  
  if (!exam) {
    return res.status(404).json({ error: 'Exam not found' });
  }

  const { answers, attemptId, mediaAnswers } = req.body;
  
  // Get questions from faculty exam
  const facultyExam = db.facultyExams.find(e => e.id === req.params.examId);
  const questions = facultyExam?.questions || exam.questions || [];

  // Calculate score
  let score = 0;
  let maxScore = 0;
  
  questions.forEach((question, index) => {
    maxScore += question.points || 1;
    
    if (question.type === 'mcq') {
      const studentAnswer = answers[question.id] || answers[index];
      if (studentAnswer === question.correctAnswer) {
        score += question.points || 1;
      }
    } else if (question.type === 'descriptive') {
      // For descriptive, we'll give partial credit if answer is provided
      const studentAnswer = answers[question.id] || answers[index];
      if (studentAnswer && studentAnswer.trim().length > 0) {
        // In a real system, this would be graded by faculty
        // For now, we'll give full points if answer exists
        score += question.points || 1;
      }
    } else if (question.type === 'viva') {
      const media = (mediaAnswers && (mediaAnswers[question.id] || mediaAnswers[index])) || null;
      if (media) {
        score += question.points || 1;
      }
    } else if (question.type === 'interview') {
      const media = (mediaAnswers && (mediaAnswers[question.id] || mediaAnswers[index])) || null;
      if (media) {
        score += question.points || 1;
      }
    }
  });

  // Create submission
  const submission = {
    id: `SUB-${Date.now()}`,
    examId: exam.id,
    studentId: req.body.studentId || 'STU001', // In real app, get from auth
    attemptId: attemptId || `ATT-${Date.now()}`,
    answers: answers,
    mediaAnswers: mediaAnswers || {},
    score: score,
    maxScore: maxScore,
    status: 'completed',
    submittedAt: new Date().toISOString(),
    startedAt: req.body.startedAt || new Date().toISOString(),
    timeSpent: req.body.timeSpent || 0,
    attempts: 1
  };

  // Save submission
  if (!db.submissions) {
    db.submissions = [];
  }
  db.submissions.push(submission);

  // Update exam submission count
  const facultyExamIndex = db.facultyExams.findIndex(e => e.id === req.params.examId);
  if (facultyExamIndex !== -1) {
    db.facultyExams[facultyExamIndex].submissionCount = (db.facultyExams[facultyExamIndex].submissionCount || 0) + 1;
  }

  // Update student exam attempts
  const studentExamIndex = db.exams.findIndex(e => e.id === req.params.examId);
  if (studentExamIndex !== -1 && db.exams[studentExamIndex].attemptsLeft > 0) {
    if (db.exams[studentExamIndex].attemptsLeft !== undefined && db.exams[studentExamIndex].attemptsLeft > 0) {
      db.exams[studentExamIndex].attemptsLeft -= 1;
    }
  }

  writeDB(db);

  res.json({
    submissionId: submission.id,
    score: score,
    maxScore: maxScore,
    percentage: Math.round((score / maxScore) * 100)
  });
});

// POST /api/student/exams/:examId/start
app.post('/api/student/exams/:examId/start', (req, res) => {
  const db = readDB();
  const exam = db.exams.find(e => e.id === req.params.examId);
  
  if (!exam) {
    return res.status(404).json({ error: 'Exam not found', message: 'Exam not found.' });
  }

  const status = getExamStatus(exam);
  if (status !== 'live') {
    return res.status(403).json({ 
      error: 'not_live', 
      message: 'Exam is not live.' 
    });
  }

  if (exam.attemptsLeft !== undefined && exam.attemptsLeft <= 0) {
    return res.status(400).json({ 
      error: 'attempts_exhausted', 
      message: 'You have no attempts left.' 
    });
  }

  // Create attempt
  const attemptId = `ATT-${Date.now()}`;
  const expiresAt = new Date(exam.endsAt).toISOString();

  res.json({
    attemptId,
    expiresAt,
    firstQuestionId: 'Q1'
  });
});

// ==================== FACULTY ENDPOINTS ====================

// GET /api/faculty/exams
app.get('/api/faculty/exams', (req, res) => {
  const db = readDB();
  let exams = db.facultyExams.map(exam => ({
    ...exam,
    status: getExamStatus(exam)
  }));

  // Filter by status
  const status = req.query.status;
  if (status && status !== 'all') {
    exams = exams.filter(e => e.status === status);
  }

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedExams = exams.slice(startIndex, endIndex);

  res.json({
    exams: paginatedExams,
    page,
    limit,
    total: exams.length
  });
});

// GET /api/faculty/stats
app.get('/api/faculty/stats', (req, res) => {
  const db = readDB();
  const exams = db.facultyExams.map(exam => ({
    ...exam,
    status: getExamStatus(exam)
  }));

  const stats = {
    totalExams: exams.length,
    activeExams: exams.filter(e => e.status === 'live').length,
    upcomingExams: exams.filter(e => e.status === 'upcoming').length,
    completedExams: exams.filter(e => e.status === 'finished').length,
    totalStudents: exams.reduce((sum, e) => sum + (e.totalStudents || 0), 0),
    avgSubmissions: exams.length > 0
      ? Math.round(exams.reduce((sum, e) => sum + (e.submissionCount || 0), 0) / exams.length)
      : 0
  };

  res.json(stats);
});

// POST /api/faculty/exams
app.post('/api/faculty/exams', (req, res) => {
  const db = readDB();
  const examData = req.body;
  const teacherName = examData.teacherName || 'Current Faculty';

  // Map attemptsAllowed to settingsSummary.attemptsLeft if needed
  const settingsSummary = examData.settingsSummary || { strictMode: false };
  if (examData.attemptsAllowed !== undefined) {
    settingsSummary.attemptsLeft = examData.attemptsAllowed;
  }
  if (examData.allowedReRecords !== undefined) {
    settingsSummary.allowedReRecords = examData.allowedReRecords;
  }
  if (examData.strictMode !== undefined) {
    settingsSummary.strictMode = examData.strictMode;
  }

  const newExam = {
    id: `FAC-EX-${Date.now()}`,
    title: examData.title,
    shortDescription: examData.shortDescription,
    startsAt: examData.startsAt,
    endsAt: examData.endsAt,
    durationMin: examData.durationMin,
    timePerQuestionSec: examData.timePerQuestionSec || null,
    status: getExamStatus(examData),
    createdAt: new Date().toISOString(),
    submissionCount: 0,
    totalStudents: 0,
    pointsTotal: examData.pointsTotal,
    teacherName,
    settingsSummary: settingsSummary
  };

  db.facultyExams.push(newExam);
  
  // Also add to student exams
  const studentExam = {
    id: newExam.id,
    title: newExam.title,
    shortDescription: newExam.shortDescription,
    startsAt: newExam.startsAt,
    endsAt: newExam.endsAt,
    durationMin: newExam.durationMin,
    timePerQuestionSec: newExam.timePerQuestionSec,
    status: newExam.status,
    attemptsLeft: newExam.settingsSummary?.attemptsLeft !== undefined ? newExam.settingsSummary.attemptsLeft : (newExam.attemptsLeft !== undefined ? newExam.attemptsLeft : undefined),
    allowedReRecords: newExam.settingsSummary?.allowedReRecords !== undefined ? newExam.settingsSummary.allowedReRecords : (newExam.allowedReRecords !== undefined ? newExam.allowedReRecords : undefined),
    teacherName,
    pointsTotal: newExam.pointsTotal,
    thumbnailUrl: null,
    settingsSummary: newExam.settingsSummary
  };
  db.exams.push(studentExam);

  writeDB(db);
  res.status(201).json(newExam);
});

// PUT /api/faculty/exams/:examId
app.put('/api/faculty/exams/:examId', (req, res) => {
  const db = readDB();
  const examIndex = db.facultyExams.findIndex(e => e.id === req.params.examId);
  
  if (examIndex === -1) {
    return res.status(404).json({ error: 'Exam not found' });
  }

  // Map attemptsAllowed to settingsSummary.attemptsLeft if needed
  const existingSettings = db.facultyExams[examIndex].settingsSummary || { strictMode: false };
  const settingsSummary = { ...existingSettings, ...(req.body.settingsSummary || {}) };
  if (req.body.attemptsAllowed !== undefined) {
    settingsSummary.attemptsLeft = req.body.attemptsAllowed;
  }
  if (req.body.allowedReRecords !== undefined) {
    settingsSummary.allowedReRecords = req.body.allowedReRecords;
  }
  if (req.body.strictMode !== undefined) {
    settingsSummary.strictMode = req.body.strictMode;
  }

  const updatedExam = {
    ...db.facultyExams[examIndex],
    ...req.body,
    settingsSummary: settingsSummary,
    status: getExamStatus(req.body)
  };

  db.facultyExams[examIndex] = updatedExam;

  // Also update student exam
  const studentExamIndex = db.exams.findIndex(e => e.id === req.params.examId);
  if (studentExamIndex !== -1) {
    db.exams[studentExamIndex] = {
      ...db.exams[studentExamIndex],
      title: updatedExam.title,
      shortDescription: updatedExam.shortDescription,
      startsAt: updatedExam.startsAt,
      endsAt: updatedExam.endsAt,
      durationMin: updatedExam.durationMin,
      timePerQuestionSec: updatedExam.timePerQuestionSec,
      status: updatedExam.status,
      attemptsLeft: updatedExam.settingsSummary?.attemptsLeft !== undefined ? updatedExam.settingsSummary.attemptsLeft : (updatedExam.attemptsLeft !== undefined ? updatedExam.attemptsLeft : undefined),
      allowedReRecords: updatedExam.settingsSummary?.allowedReRecords !== undefined ? updatedExam.settingsSummary.allowedReRecords : (updatedExam.allowedReRecords !== undefined ? updatedExam.allowedReRecords : undefined),
      teacherName: updatedExam.teacherName || db.exams[studentExamIndex].teacherName || 'Current Faculty',
      pointsTotal: updatedExam.pointsTotal,
      questions: updatedExam.questions || db.exams[studentExamIndex].questions || [],
      settingsSummary: updatedExam.settingsSummary
    };
  }

  writeDB(db);
  res.json(updatedExam);
});

// DELETE /api/faculty/exams/:examId
app.delete('/api/faculty/exams/:examId', (req, res) => {
  const db = readDB();
  const examIndex = db.facultyExams.findIndex(e => e.id === req.params.examId);
  
  if (examIndex === -1) {
    return res.status(404).json({ error: 'Exam not found' });
  }

  db.facultyExams.splice(examIndex, 1);

  // Also remove from student exams
  const studentExamIndex = db.exams.findIndex(e => e.id === req.params.examId);
  if (studentExamIndex !== -1) {
    db.exams.splice(studentExamIndex, 1);
  }

  writeDB(db);
  res.status(204).send();
});

// ==================== DRAFT EXAM ENDPOINTS ====================

// Initialize drafts array if it doesn't exist
function ensureDraftsArray(db) {
  if (!db.draftExams) {
    db.draftExams = [];
  }
}

// GET /api/faculty/exams/drafts
app.get('/api/faculty/exams/drafts', (req, res) => {
  const db = readDB();
  ensureDraftsArray(db);
  res.json(db.draftExams || []);
});

// POST /api/faculty/exams/drafts
app.post('/api/faculty/exams/drafts', (req, res) => {
  const db = readDB();
  ensureDraftsArray(db);
  const draftData = req.body;

  const newDraft = {
    id: `DRAFT-${Date.now()}`,
    title: draftData.title,
    shortDescription: draftData.shortDescription,
    instructions: draftData.instructions || null,
    status: 'draft',
    questions: draftData.questions || [],
    createdAt: new Date().toISOString(),
    teacherName: draftData.teacherName || 'Current Faculty'
  };

  db.draftExams.push(newDraft);
  writeDB(db);
  res.status(201).json(newDraft);
});

// PUT /api/faculty/exams/drafts/:draftId
app.put('/api/faculty/exams/drafts/:draftId', (req, res) => {
  try {
    const db = readDB();
    ensureDraftsArray(db);
    const draftIndex = db.draftExams.findIndex(d => d.id === req.params.draftId);
    
    if (draftIndex === -1) {
      console.error('Draft not found:', req.params.draftId);
      return res.status(404).json({ error: 'Draft not found', draftId: req.params.draftId });
    }

    const updatedDraft = {
      ...db.draftExams[draftIndex],
      ...req.body
    };

    db.draftExams[draftIndex] = updatedDraft;
    
    const writeSuccess = writeDB(db);
    if (!writeSuccess) {
      return res.status(500).json({ error: 'Failed to save draft to database' });
    }
    
    res.json(updatedDraft);
  } catch (error) {
    console.error('Error updating draft:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// POST /api/faculty/exams/drafts/:draftId/publish
app.post('/api/faculty/exams/drafts/:draftId/publish', (req, res) => {
  const db = readDB();
  ensureDraftsArray(db);
  const draftIndex = db.draftExams.findIndex(d => d.id === req.params.draftId);
  
  if (draftIndex === -1) {
    return res.status(404).json({ error: 'Draft not found' });
  }

  const draft = db.draftExams[draftIndex];
  const examData = req.body;
  const teacherName = examData.teacherName || draft.teacherName || 'Current Faculty';

  // Map attemptsAllowed to settingsSummary.attemptsLeft if needed
  const settingsSummary = examData.settingsSummary || { strictMode: false };
  if (examData.attemptsAllowed !== undefined) {
    settingsSummary.attemptsLeft = examData.attemptsAllowed;
  }
  if (examData.allowedReRecords !== undefined) {
    settingsSummary.allowedReRecords = examData.allowedReRecords;
  }
  if (examData.strictMode !== undefined) {
    settingsSummary.strictMode = examData.strictMode;
  }

  const newExam = {
    id: `FAC-EX-${Date.now()}`,
    title: examData.title,
    shortDescription: examData.shortDescription,
    startsAt: examData.startsAt,
    endsAt: examData.endsAt,
    durationMin: examData.durationMin,
    timePerQuestionSec: examData.timePerQuestionSec || null,
    status: getExamStatus(examData),
    createdAt: new Date().toISOString(),
    submissionCount: 0,
    totalStudents: 0,
    pointsTotal: examData.pointsTotal,
    questions: examData.questions || [],
    teacherName,
    settingsSummary: settingsSummary
  };

  db.facultyExams.push(newExam);
  
  // Also add to student exams
  const studentExam = {
    id: newExam.id,
    title: newExam.title,
    shortDescription: newExam.shortDescription,
    startsAt: newExam.startsAt,
    endsAt: newExam.endsAt,
    durationMin: newExam.durationMin,
    timePerQuestionSec: newExam.timePerQuestionSec,
    status: newExam.status,
    attemptsLeft: newExam.settingsSummary?.attemptsLeft !== undefined ? newExam.settingsSummary.attemptsLeft : (newExam.attemptsLeft !== undefined ? newExam.attemptsLeft : undefined),
    allowedReRecords: newExam.settingsSummary?.allowedReRecords !== undefined ? newExam.settingsSummary.allowedReRecords : (newExam.allowedReRecords !== undefined ? newExam.allowedReRecords : undefined),
    teacherName,
    pointsTotal: newExam.pointsTotal,
    questions: newExam.questions || [],
    thumbnailUrl: null,
    settingsSummary: newExam.settingsSummary
  };
  db.exams.push(studentExam);

  // Remove draft
  db.draftExams.splice(draftIndex, 1);

  writeDB(db);
  res.status(201).json(newExam);
});

// DELETE /api/faculty/exams/drafts/:draftId
app.delete('/api/faculty/exams/drafts/:draftId', (req, res) => {
  const db = readDB();
  ensureDraftsArray(db);
  const draftIndex = db.draftExams.findIndex(d => d.id === req.params.draftId);
  
  if (draftIndex === -1) {
    return res.status(404).json({ error: 'Draft not found' });
  }

  db.draftExams.splice(draftIndex, 1);
  writeDB(db);
  res.status(204).send();
});

// GET /api/faculty/students
app.get('/api/faculty/students', (req, res) => {
  const db = readDB();
  let students = [...db.students];

  // Filter by department
  if (req.query.department && req.query.department !== 'all') {
    students = students.filter(s => s.department === req.query.department);
  }

  // Filter by year
  if (req.query.year) {
    students = students.filter(s => s.year === parseInt(req.query.year));
  }

  // Search
  if (req.query.search) {
    const query = req.query.search.toLowerCase();
    students = students.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.enrollment.toLowerCase().includes(query) ||
      s.email.toLowerCase().includes(query)
    );
  }

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedStudents = students.slice(startIndex, endIndex);

  res.json({
    students: paginatedStudents,
    page,
    limit,
    total: students.length
  });
});

// GET /api/faculty/students/:studentId
app.get('/api/faculty/students/:studentId', (req, res) => {
  const db = readDB();
  const student = db.students.find(s => s.id === req.params.studentId);
  
  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }

  // Get student's exam submissions
  const submissions = db.submissions
    .filter(s => s.studentId === req.params.studentId)
    .map(sub => {
      const exam = db.exams.find(e => e.id === sub.examId);
      return {
        examId: sub.examId,
        examTitle: exam?.title || 'Unknown Exam',
        status: sub.status,
        score: sub.score,
        maxScore: sub.maxScore,
        submittedAt: sub.submittedAt,
        startedAt: sub.startedAt,
        timeSpent: sub.timeSpent,
        attempts: sub.attempts
      };
    });

  const stats = {
    totalExams: submissions.length,
    completedExams: submissions.filter(s => s.status === 'completed').length,
    averageScore: submissions.filter(s => s.status === 'completed' && s.score !== null).length > 0
      ? submissions
          .filter(s => s.status === 'completed' && s.score !== null)
          .reduce((sum, s) => sum + (s.score / s.maxScore * 100), 0) /
        submissions.filter(s => s.status === 'completed' && s.score !== null).length
      : 0,
    totalAttempts: submissions.reduce((sum, s) => sum + s.attempts, 0)
  };

  res.json({
    ...student,
    examSubmissions: submissions,
    stats
  });
});

// GET /api/faculty/exams/:examId/submissions
app.get('/api/faculty/exams/:examId/submissions', (req, res) => {
  const db = readDB();
  const submissions = (db.submissions || []).filter(s => s.examId === req.params.examId);

  const submissionsWithStudentInfo = submissions.map(sub => {
    const student = db.students.find(s => s.id === sub.studentId);
    return {
      studentId: sub.studentId,
      studentName: student?.name || 'Unknown',
      studentEnrollment: student?.enrollment || '',
      status: sub.status,
      score: sub.score,
      maxScore: sub.maxScore,
      submittedAt: sub.submittedAt,
      startedAt: sub.startedAt,
      attempts: sub.attempts
    };
  });

  res.json({
    submissions: submissionsWithStudentInfo,
    total: submissionsWithStudentInfo.length
  });
});

// GET /api/student/exams/:examId/submissions
app.get('/api/student/exams/:examId/submissions', (req, res) => {
  const db = readDB();
  const studentId = req.query.studentId || 'STU001'; // In real app, get from auth
  const submissions = (db.submissions || []).filter(s => 
    s.examId === req.params.examId && s.studentId === studentId
  );

  res.json({
    submissions: submissions,
    total: submissions.length
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mock API Server running on http://localhost:${PORT}`);
  console.log(`📊 Database file: ${DB_PATH}`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  Student:`);
  console.log(`    GET    /api/student/exams`);
  console.log(`    GET    /api/student/exams/:examId/summary`);
  console.log(`    POST   /api/student/exams/:examId/start`);
  console.log(`  Faculty:`);
  console.log(`    GET    /api/faculty/exams`);
  console.log(`    GET    /api/faculty/stats`);
  console.log(`    POST   /api/faculty/exams`);
  console.log(`    PUT    /api/faculty/exams/:examId`);
  console.log(`    DELETE /api/faculty/exams/:examId`);
  console.log(`    GET    /api/faculty/students`);
  console.log(`    GET    /api/faculty/students/:studentId`);
  console.log(`    GET    /api/faculty/exams/:examId/submissions`);
});
