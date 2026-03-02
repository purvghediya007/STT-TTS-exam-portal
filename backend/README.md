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
│   │   ├── analyticsRoutes.js
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
│   │   ├── evaluationService.js
│   │   ├── localStorageService.js
│   │   ├── performanceAnalyticsService.js
│   │   └── questionGenerationService.js
│   ├── workers/
│   │   ├── aiEvaluationWorker.js
│   │   └── transcriptionWorker.js
│   ├── queues/
│   │   ├── aiQueue.js
│   │   ├── answersEvaluationQueue.js
│   │   └── answersTranscriptionQueue.js
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
# Server
PORT=5000

# MongoDB connection
MONGO_URI=your-mongo-uri-here

# JWT secret
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRES_IN=1h
JWT_RESET_SECRET=your-jwt-reset-secret-here

# Captcha
CAPTCHA_EXPIRES_MS=300000

# Gemini API
GEMINI_API_KEY=your-gemini-api-key-here
AI_PROVIDER=gemini
AI_MODEL=gemini-2.5-flash

# Optional
NODE_ENV=development

# Email
MAIL_USER=your-mail-user-here
MAIL_PASS=your-mail-pass-here
FRONTEND_URL=http://localhost:5173

# FastAPI
APP_ENV=development
APP_HOST=0.0.0.0
APP_PORT=8000

# Hugging Face (optional)
HF_TOKEN=your_huggingface_token_here

# Database (optional - for PostgreSQL if used)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stt_tts_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# Other
DEBUG=true
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
POST   /api/exams/:id/questions
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
GET    /api/faculty/exams
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

| Package                     | Purpose            |
| --------------------------- | ------------------ |
| `express`                   | Web framework      |
| `mongoose`                  | MongoDB ODM        |
| `jsonwebtoken`              | JWT auth           |
| `bcrypt`                    | Password hashing   |
| `bullmq`                    | Job queue          |
| `ioredis`                   | Redis client       |
| `@google/generative-ai`     | Gemini API         |
| `cloudinary`                | Cloud storage      |
| `multer`                    | File upload        |
| `multer-storage-cloudinary` | Cloudinary storage |
| `nodemailer`                | Email service      |
| `openai`                    | OpenAI API         |
| `svg-captcha`               | CAPTCHA generation |
| `uuid`                      | UUID generation    |
| `dotenv`                    | Environment config |
| `axios`                     | HTTP client        |
| `form-data`                 | Form data handling |
| `cors`                      | CORS middleware    |

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

**Last Updated**: March 2, 2026
