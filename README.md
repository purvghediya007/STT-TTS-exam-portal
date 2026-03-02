# 🎓 ExamEcho – AI-Powered STT-TTS Oral Examination Portal

ExamEcho is an **intelligent examination platform** that enables **voice-based exams** with automatic transcription, AI-driven evaluation, and optional text-to-speech feedback. Students speak their answers, the system transcribes them, evaluates using advanced AI models, and provides instant feedback.

## 🌟 Key Features

- 🗣️ **Speech-to-Text (STT)** – Transcribe student answers using OpenAI Whisper
- 🧠 **AI Evaluation Engine** – Evaluate answers using HuggingFace transformers & Google Gemini
- 🔊 **Text-to-Speech (TTS)** – Generate feedback audio using gTTS
- 🎧 **Audio Processing** – Pre-process audio for optimal STT accuracy
- 📊 **Multi-user System** – Admin, Teacher, and Student roles
- ✅ **Multiple Question Types** – Essay, MCQ with automatic evaluation
- 🔐 **Secure Authentication** – JWT-based auth with role-based access
- 🚀 **Async Processing** – Background job queues for AI evaluation
- 📈 **Real-time Results** – Instant scoring and feedback

---

## 🏗️ Project Structure

```
STT-TTS-exam-portal/
│
├── README.md                           # This file
│
├── backend/                            # Node.js Express backend
│   ├── server.js                       # Express server entry point
│   ├── package.json                    # Node.js dependencies
│   ├── README.md                       # Backend setup guide
│   ├── src/
│   │   ├── app.js                      # Express configuration
│   │   ├── config/
│   │   │   ├── db.js                   # MongoDB connection
│   │   │   └── redis.js                # Redis/BullMQ setup
│   │   ├── models/                     # Mongoose schemas
│   │   ├── routes/                     # API routes
│   │   ├── middleware/                 # Custom middleware
│   │   ├── services/                   # Business logic
│   │   ├── workers/                    # Background job workers
│   │   ├── queues/                     # Job queue setup
│   │   └── utils/                      # Utility functions
│   │
│   └── fastapi_backend/                # Python FastAPI microservice
│       ├── Dockerfile                  # Docker configuration
│       ├── requirements.txt            # Python dependencies
│       ├── README.md                   # FastAPI setup guide
│       ├── app/
│       │   ├── main.py                 # FastAPI app entry
│       │   ├── config.py               # FastAPI configuration
│       │   ├── routers/                # API endpoints (health, stt, tts, evaluation, questions, analytics, upload)
│       │   ├── schemas/                # Pydantic models
│       │   ├── services/               # Core AI services
│       │   └── workers/                # Background workers
│       ├── ai_ml/                      # Machine learning modules
│   │   │   ├── AIExceptions.py
│   │   │   ├── AudioPreprocessor.py
│   │   │   ├── Evaluation.py
│   │   │   ├── MCQEvaluation.py
│   │   │   ├── ModelCreator.py
│   │   │   ├── QuestionsGenerator.py
│   │   │   ├── Rubrics.py
│   │   │   ├── Speech2Text.py
│   │   │   └── Text2Speech.py
│
├── frontend/                           # React + Vite frontend
│   ├── package.json                    # React dependencies
│   ├── README.md                       # Frontend setup guide
│   ├── vite.config.js                  # Vite configuration
│   ├── tailwind.config.js              # Tailwind CSS configuration
│   ├── postcss.config.js               # PostCSS configuration
│   ├── eslint.config.js                # ESLint configuration
│   ├── index.html                      # Entry HTML
│   ├── public/                         # Static assets
│   ├── server/                         # Mock server for development
│   └── src/
│       ├── api/                        # API client configuration
│       ├── assets/                     # Static assets (images, icons)
│       ├── components/                 # Reusable UI components (25+ components)
│       ├── contexts/                   # React context (AuthContext)
│       ├── hooks/                      # Custom React hooks (5+ hooks)
│       ├── pages/                      # Page components (22+ pages)
│       ├── services/                   # API client services
│       ├── test/                       # Test files
│       └── utils/                      # Utility functions
│
```

---

## 🚀 Quick Start Guide

### Prerequisites

- **Node.js** (v18+)
- **Python** (v3.9+)
- **MongoDB** (local or Atlas)
- **Redis** (for job queues)

### Quick Setup (5 minutes)

#### 1. Clone & Install Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

#### 2. Setup FastAPI (Python)

```bash
cd backend/fastapi_backend
python -m venv venv
# Activate: venv\Scripts\activate (Windows) or source venv/bin/activate (Mac/Linux)
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### 3. Setup Frontend

```bash
cd frontend
npm install
npm run dev
# In another terminal:
npm run server:node
```

**Access:**

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api
- FastAPI Docs: http://localhost:8000/docs

---

## 📋 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              FRONTEND (React + Vite)                        │
│  Student Exam Interface | Teacher Dashboard | Admin Panel   │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/REST API
┌──────────────────────────┴──────────────────────────────────┐
│         BACKEND (Node.js Express)                           │
│  Auth | Exam Management | Job Queuing | Answer Recording    │
└──────┬────────────────────────┬─────────────────────────────┘
       │ (BullMQ Jobs)          │ (REST API)
       ▼                        ▼
┌──────────────────────────────────────────────────────────┐
│     FASTAPI MICROSERVICE (Python)                        │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐              │
│  │STT       │  │Evaluation│  │TTS (gTTS)  │               │
│  │(Whisper) │  │(HF+      │  │            │               │
│  │          │  │Gemini)   │  │            │               │
│  └──────────┘  └──────────┘  └────────────┘              │
└──────────────────────────────────────────────────────────┘
```

---

## 📚 Documentation

- **[Backend Setup](./backend/README.md)** – Express API, authentication, database
- **[Frontend Setup](./frontend/README.md)** – React UI, components, styling
- **[FastAPI Setup](./backend/fastapi_backend/README.md)** – AI services, models

---

## 🔄 Typical Workflow

1. Student logs in → Backend authenticates with JWT
2. Student joins exam → Exam attempt recorded in MongoDB
3. Student records answer → Audio uploaded to storage
4. Backend queues transcription job → BullMQ
5. FastAPI transcribes with Whisper STT
6. Backend queues evaluation job
7. FastAPI evaluates with HuggingFace + Gemini LLM
8. Results stored → Frontend displays scores & feedback

---

## 🔐 Security

- ✅ JWT Authentication
- ✅ Role-Based Access Control (Admin, Teacher, Student)
- ✅ Password Hashing (bcrypt)
- ✅ Input Validation & Sanitization
- ✅ CORS Protection
- ✅ Environment Variable Config

---

## 📦 Tech Stack

**Frontend:**

- React 19, Vite, Tailwind CSS, React Router

**Backend:**

- Node.js, Express, MongoDB, Redis, BullMQ

**AI/ML:**

- FastAPI, HuggingFace Transformers, OpenAI Whisper, gTTS, Google Gemini

**Infrastructure:**

- Docker, Docker Compose

---

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and test
3. Commit: `git commit -m "Add your feature"`
4. Push: `git push origin feature/your-feature`
5. Create Pull Request

---

## 📞 Support

- Check documentation in `/docs`
- Review code comments for implementation details
- Report issues on GitHub

---

## 📄 License

MIT License - see LICENSE file for details

---

**Last Updated:** March 2, 2026
