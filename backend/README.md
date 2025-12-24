# 🔧 Backend – Node.js Express API for Oral Examination Portal

This is the **Node.js + Express backend** for the ExamEcho AI-powered examination platform. It handles authentication, exam management, answer recording, job queuing, and integration with the Python FastAPI microservice for AI evaluation.

---

## 🌟 Features

✅ **Multi-User System**

- Admin: System administration
- Teacher: Create exams, questions, review results
- Student: Take exams, submit answers, view results

✅ **Exam Management**

- Create, edit, delete exams
- Bulk question upload via JSON
- Question scheduling and availability

✅ **Answer Processing**

- Record student answers (audio/text)
- Queue answers for async evaluation
- Real-time result tracking

✅ **AI Integration**

- Async evaluation using FastAPI microservice
- Google Gemini API for LLM scoring
- HuggingFace transformers for NLP evaluation
- Background job processing with BullMQ

✅ **Security**

- JWT-based authentication
- Role-based access control
- Password hashing with bcrypt
- SVG CAPTCHA on login
- Input validation & sanitization

✅ **Storage Options**

- MongoDB for data persistence
- Cloudinary for cloud audio storage
- Local filesystem storage
- Redis for caching & job queues

---

## 🏗️ Architecture

```
backend/
├── server.js                           # Express server entry point
├── package.json                        # Node.js dependencies
├── .env                                # Environment variables (not in repo)
│
├── src/
│   ├── app.js                          # Express app configuration
│   ├── config/
│   │   ├── db.js                       # MongoDB connection
│   │   └── redis.js                    # Redis/BullMQ setup
│   ├── models/                         # Mongoose schemas
│   │   ├── Admin.js
│   │   ├── Teacher.js
│   │   ├── Student.js
│   │   ├── Exam.js
│   │   ├── Question.js
│   │   ├── StudentExamAttempt.js
│   │   └── StudentAnswer.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── examRoutes.js
│   │   ├── facultyRoutes.js
│   │   ├── studentExamRoutes.js
│   │   └── uploadRoutes.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── errorHandler.js
│   │   ├── requireRole.js
│   │   └── uploadJson.js
│   ├── services/
│   │   ├── cloudinaryService.js
│   │   ├── localStorageService.js
│   │   └── evaluationService.js
│   ├── workers/
│   │   ├── aiWorker.js
│   │   ├── transcriptionWorker.js
│   │   └── aiEvaluationWorker.js
│   ├── queues/
│   │   ├── aiQueue.js
│   │   ├── answersTranscriptionQueue.js
│   │   └── answersEvaluationQueue.js
│   └── utils/
│
├── fastapi_backend/
│   └── ... (see FastAPI README)
│
└── uploads/
    ├── audio/
    └── answers/
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ ([Download](https://nodejs.org/))
- **MongoDB** (Local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- **Redis** (Local or cloud Redis instance)
- **Cloudinary** account (optional, for cloud storage)
- **Google Gemini API Key** ([Get here](https://ai.google.dev/))
- **npm** or **yarn**

### Installation Steps

#### 1. Install Dependencies

```bash
cd backend
npm install
```

#### 2. Create Environment File

```bash
cp .env.example .env
```

#### 3. Configure Environment Variables

Edit `.env`:

```env
# ==================== SERVER ====================
PORT=5000
NODE_ENV=development

# ==================== DATABASE ====================
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/examecho?retryWrites=true&w=majority

# ==================== REDIS & JOB QUEUE ====================
REDIS_URL=redis://localhost:6379

# ==================== AUTHENTICATION ====================
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRE=7d

# ==================== AI SERVICES ====================
GEMINI_API_KEY=your-google-gemini-api-key
OPENAI_API_KEY=your-openai-api-key

# ==================== STORAGE ====================
CLOUDINARY_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-secret
LOCAL_STORAGE_PATH=./uploads

# ==================== FastAPI MICROSERVICE ====================
FASTAPI_URL=http://localhost:8000
FASTAPI_TIMEOUT=300000

# ==================== CORS ====================
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

---

## 📦 Scripts

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

### Create Admin

```bash
npm run create-admin
```

---

## 📡 API Endpoints

### Authentication

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh-token
POST   /api/auth/logout
GET    /api/auth/captcha
```

### Exam Management

```
GET    /api/exams
POST   /api/exams
GET    /api/exams/:id
PUT    /api/exams/:id
DELETE /api/exams/:id
POST   /api/exams/:id/bulk-upload
GET    /api/exams/:id/results
```

### Student Exam

```
GET    /api/exams/available
POST   /api/exams/:id/attempt
POST   /api/answers
GET    /api/answers/:attemptId
POST   /api/exam-attempts/:attemptId/submit
```

### Faculty

```
GET    /api/faculty/dashboard
GET    /api/faculty/students
GET    /api/faculty/submissions
```

---

## 🔄 Answer Processing Flow

```
1. Student submits audio answer
   ↓
2. Audio saved to storage (Cloudinary/Local)
   ↓
3. Transcription job queued (BullMQ)
   ↓
4. FastAPI processes transcription (Whisper)
   ↓
5. Evaluation job queued
   ↓
6. FastAPI evaluates answer (HuggingFace + Gemini)
   ↓
7. Results stored in MongoDB
```

---

## 🔐 Security

- JWT Authentication with expiration
- Role-based access control (Admin, Teacher, Student)
- bcrypt password hashing
- CAPTCHA protection
- Input validation
- CORS protection

---

## 🗄️ Database Schema

### Collections

**StudentExamAttempt**

```javascript
{
  _id: ObjectId,
  studentId: ObjectId,
  examId: ObjectId,
  startTime: Date,
  endTime: Date,
  status: "in-progress" | "completed" | "submitted",
  totalScore: Number,
  feedback: String
}
```

**StudentAnswer**

```javascript
{
  _id: ObjectId,
  attemptId: ObjectId,
  questionId: ObjectId,
  audioUrl: String,
  transcription: String,
  evaluationScore: Number,
  feedback: String
}
```

---

## 🚀 Deployment

### Using Docker

```bash
docker build -t examecho-backend .
docker run -p 5000:5000 -e MONGODB_URI=... examecho-backend
```

### Using Heroku

```bash
heroku login
heroku create your-app-name
heroku config:set MONGODB_URI=...
git push heroku main
```

---

## 📝 Dependencies

| Package                 | Purpose            |
| ----------------------- | ------------------ |
| `express`               | Web framework      |
| `mongoose`              | MongoDB ODM        |
| `jsonwebtoken`          | JWT auth           |
| `bcrypt`                | Password hashing   |
| `bullmq`                | Job queue          |
| `ioredis`               | Redis client       |
| `@google/generative-ai` | Gemini API         |
| `cloudinary`            | Cloud storage      |
| `multer`                | File upload        |
| `dotenv`                | Environment config |

---

## 🆘 Troubleshooting

### MongoDB Connection Failed

- Check MongoDB URI in `.env`
- Ensure IP is whitelisted in MongoDB Atlas
- Verify network connection

### Redis Connection Error

- Start Redis: `redis-server`
- Check Redis URL: `redis://localhost:6379`

### FastAPI Not Responding

- Ensure FastAPI is running on port 8000
- Check `FASTAPI_URL` in `.env`

---

## 🔗 Related Documentation

- [Main Project README](../README.md)
- [FastAPI Setup](./fastapi_backend/README.md)
- [Frontend Setup](../frontend/README.md)

---

**Last Updated**: December 24, 2025
