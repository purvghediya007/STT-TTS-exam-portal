🧠 AI-Powered Oral Examination System

An intelligent platform that automates oral exams using Speech Recognition (STT), Text-to-Speech (TTS), and AI-based evaluation.

📘 Overview

This project introduces a fully automated AI-based Oral Examination System that leverages Speech-to-Text (STT) and Text-to-Speech (TTS) technologies integrated with Machine Learning (ML) and Natural Language Processing (NLP) for evaluating spoken answers.

The system:

Reads questions aloud using TTS

Listens to spoken answers using STT

Converts answers into text

Uses AI/ML models to analyze and score responses based on accuracy, content, and clarity

The entire process eliminates human bias, reduces examiner workload, and enhances accessibility and scalability for educational institutions.

🎯 Project Objectives

Automate the oral examination process using AI.

Provide real-time evaluation and feedback.

Ensure fair, unbiased, and efficient grading.

Improve accessibility for students with diverse language abilities.

Demonstrate the integration of AI with full-stack web technologies.

⚙️ Tech Stack
Layer	Technologies
Frontend	React.js, Tailwind CSS, Bootstrap, Axios
Backend	Node.js, Express.js, MongoDB
AI/ML Module	Python, SpeechRecognition, pyttsx3, Whisper API, Transformers, OpenAI API
Tools	VS Code, Postman, Git, GitHub
Version Control	GitHub
Deployment	Render / Vercel (Frontend), Railway / Render (Backend)
🧩 Project Architecture
AI-Oral-Exam/
│
├── frontend/                 # React-based user interface
│   ├── public/
│   ├── src/
│   │   ├── components/       # UI Components (Navbar, ExamPage, ResultPage)
│   │   ├── pages/            # Page views
│   │   ├── services/         # API integration with backend
│   │   └── App.js
│   └── package.json
│
├── backend/                  # Node.js + Express.js API
│   ├── controllers/          # API controllers for exams, users, results
│   ├── models/               # MongoDB schemas
│   ├── routes/               # REST API endpoints
│   ├── middleware/           # Auth and error handling
│   ├── server.js
│   └── package.json
│
├── ai-ml/                    # Python AI/ML components
│   ├── speech_to_text.py     # STT using Whisper or SpeechRecognition
│   ├── text_to_speech.py     # TTS using pyttsx3 or gTTS
│   ├── answer_evaluation.py  # AI model for evaluating answers
│   └── model/                # Trained models, embeddings
│
└── README.md

👨‍💻 Roles and Responsibilities
Team Member	Role	Responsibilities
Frontend Developer	React Developer	Build interactive UI, integrate with backend APIs, manage state, and design responsive components.
Backend Developer	Node.js Engineer	Design REST APIs, handle database models, authentication, and communication between AI and frontend.
AI/ML Developer	Data & AI Engineer	Implement Speech-to-Text (STT), Text-to-Speech (TTS), and AI-based evaluation logic using Python and ML libraries.

💡 All three modules are designed to work independently yet communicate seamlessly, ensuring modularity and scalability.

🚀 Features

✅ Voice-based question-answer system
✅ Automated speech-to-text conversion
✅ Text-to-speech functionality for question delivery
✅ AI-powered semantic answer evaluation
✅ Real-time feedback and scoring
✅ Role-based interface (Examiner / Student)
✅ Modern, responsive UI built with React & Tailwind CSS

🧪 How It Works

System reads a question aloud using TTS.

Student answers verbally through the microphone.

Speech-to-Text converts the spoken answer to text.

AI model evaluates the text by comparing it to ideal answers.

Result & feedback are displayed instantly.
