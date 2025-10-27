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

| Layer | Technologies |
|-------|---------------|
| 🎨 **Frontend** | React.js, Tailwind CSS |
| ⚙️ **Backend** | Node.js, Express.js |
| 🧠 **Database** | MongoDB |
| 🤖 **AI/ML Layer** | Python, STT (Whisper/Vosk), TTS (pyttsx3), LLMs (GPT/LLaMA/Gemma) |
| 🧰 **Tools** | Git, VS Code, Postman, Render/Vercel |

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
│   ├── components/        → Navbar, ExamPage, ResultPage, etc.
│   ├── pages/             → Page-level views and routing
│   └── App.js
│
└── package.json

⚙️ Backend (Node.js + Express)

backend/
│
├── controllers/           → Route handling logic
├── models/                → Database schemas
├── routes/                → API endpoints
├── middleware/            → Auth and validation
├── server.js
└── package.json

🧠 AI & ML (Python)

ai-ml/
│
├── speech_to_text.py      → Speech recognition module
├── text_to_speech.py      → Text-to-speech conversion
├── evaluate_answer.py     → AI-based answer evaluation
└── model/                 → Trained models and related resources


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
