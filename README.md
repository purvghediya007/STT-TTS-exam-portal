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
├── requirements.txt                    # Python dependencies (root level)
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
│       │   ├── routers/                # API endpoints
│       │   ├── services/               # Core AI services
│       │   └── schemas/                # Pydantic models
│       └── ai_ml/                      # Machine learning modules
│
├── frontend/                           # React + Vite frontend
│   ├── package.json                    # React dependencies
│   ├── README.md                       # Frontend setup guide
│   ├── vite.config.js                  # Vite configuration
│   ├── index.html                      # Entry HTML
│   ├── public/                         # Static assets
│   └── src/
│       ├── components/                 # Reusable UI components
│       ├── pages/                      # Page components
│       ├── services/                   # API client services
│       ├── contexts/                   # React context
│       ├── hooks/                      # Custom React hooks
│       └── utils/                      # Utility functions
│
└── docs/                               # Documentation files
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
- **[Audio Files Guide](./AUDIO_FILES_QUICK_GUIDE.md)** – Audio handling & storage

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


- Docker,Docker Compose

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

**Last Updated**: December 24, 2025

Frontend will communicate with backend at:

```
http://localhost:8000
```

---

# 🧱 **Architecture Overview**

```
┌────────────────────┐        ┌────────────────────────────┐
│     Frontend       │        │      FastAPI Backend       │
│  (React / Optional)│──────▶│ - STT Service              │
└────────────────────┘        │ - Evaluation Engine        │
                              │ - Audio/TTS Service        │
                              └────────────────────────────┘
                                            │
                                            ▼
                              ┌────────────────────────────┐
                              │      AI / ML Models        │
                              │ (Whisper, LLM Evaluator)   │
                              └────────────────────────────┘
```

---

# 🔧 **Development Notes**

- STT supports `.wav`, `.mp3`, `.webm`, etc.
- Large models are loaded lazily for performance.
- Update dependencies → rebuild Docker image:

```bash
docker build --no-cache -t examecho-backend .
```

---

# 🛠 **Contributing**

1. Fork the repo
2. Create a feature branch
3. Submit PR with clear description
4. Avoid committing large audio/model files

---

# 📌 **Future Enhancements**

- Full TTS integration
- Student portal
- Teacher dashboard
- Exam analytics & reporting
- Containerized frontend + docker‑compose

---

# 📜 **License**

MIT License

---

# ✉️ **Contact**

For support or collaboration, open an Issue or reach out through GitHub.

---

# 🎓 STT–TTS AI Oral Examination Portal

> 🗣️ An AI-powered system that listens, understands, and evaluates student responses — automatically.

---

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-React-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Backend-Node.js-green?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Database-MongoDB-brightgreen?style=for-the-badge" />
  <img src="https://img.shields.io/badge/AI%2FML-Python-yellow?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Status-In%20Development-orange?style=for-the-badge" />
</p>

---

## 🧭 Project Overview

The **STT–TTS Exam Portal** is an **AI-powered oral examination platform** designed to conduct voice-based exams automatically.  
It allows students to **answer verbally**, while the system listens, converts speech to text, evaluates the response using AI, and finally provides **marks and feedback** — all without human involvement.

This project seamlessly integrates **Speech Recognition, Natural Language Processing, and AI Evaluation** into one cohesive system.  
Its key purpose is to make examinations more **accessible, unbiased, and scalable** for both students and institutions.

---

## 🎯 Objectives

- 🧠 Automate oral examination and grading.
- 🗣️ Allow students to answer using voice instead of typing.
- ⚡ Provide instant scoring and meaningful feedback.
- 🧩 Ensure consistency and remove human bias.
- 🌍 Improve accessibility for visually impaired learners.

---

## ⚙️ Tech Stack

| Layer              | Technologies                                                      |
| ------------------ | ----------------------------------------------------------------- |
| 🎨 **Frontend**    | React.js, Tailwind CSS                                            |
| ⚙️ **Backend**     | Node.js, Express.js                                               |
| 🧠 **Database**    | MongoDB                                                           |
| 🤖 **AI/ML Layer** | Python, STT (Whisper/Vosk), TTS (pyttsx3), LLMs (GPT/LLaMA/Gemma) |
| 🧰 **Tools**       | Git, VS Code, Postman, Render/Vercel                              |

---

🏗️ Project Structure

📂 Root Directory

stt-tts-exam-portal/
│
├── frontend/
├── backend/
├── ai-ml/
└── README.md

🎨 Frontend (React + Tailwind)

frontend/
│
├── src/
│ ├── components/ → Navbar, ExamPage, ResultPage, etc.
│ ├── pages/ → Page-level views and routing
│ └── App.js
│
└── package.json

⚙️ Backend (Node.js + Express)

backend/
│
├── controllers/ → Route handling logic
├── models/ → Database schemas
├── routes/ → API endpoints
├── middleware/ → Auth and validation
├── server.js
└── package.json

🧠 AI & ML (Python)

ai-ml/
│
├── speech_to_text.py → Speech recognition module
├── text_to_speech.py → Text-to-speech conversion
├── evaluate_answer.py → AI-based answer evaluation
└── model/ → Trained models and related resources

## 🚀 Key Features

- 🎧 **Speech-to-Text (STT)** – Captures and converts spoken answers.
- 🔊 **Text-to-Speech (TTS)** – Reads questions aloud automatically.
- 🤖 **AI Evaluation** – Grades and provides instant feedback.
- 📊 **Instant Result Summary** – Displays marks and insights after each test.
- 🧩 **Modular Architecture** – Separate layers for scalability and teamwork.
- 💬 **Modern UI** – Built with React + Tailwind for responsiveness.

---

## 🧠 Workflow

1️⃣ **TTS Module:** System reads each question aloud.  
2️⃣ **STT Module:** Student answers verbally; speech is transcribed.  
3️⃣ **Evaluation Engine:** AI analyzes, scores, and generates feedback.  
4️⃣ **Result Summary:** Displayed instantly to the student.
