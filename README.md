# 🎓 **ExamEcho – AI‑Powered STT–TTS Oral Examination Portal**

ExamEcho is an AI-driven platform that enables **voice‑based examinations**.  
Students speak their answers → the system **transcribes**, **evaluates**, and optionally **responds with TTS feedback**.

This project combines:

- 🗣 **Speech-to-Text (STT)**  
- 🧠 **AI Evaluation Engine**  
- 🔊 **Text-to-Speech (TTS)**  
- 🎧 **Audio Processing**  
- ⚙️ **FastAPI Backend**  
- 🐳 **Full Dockerization for easy onboarding**

---

# 🧭 **Project Overview**

ExamEcho aims to automate oral examinations using AI.  
It ensures:

- **Fair & unbiased evaluation**  
- **Scalable exam-taking**  
- **Accessible testing for students**  
- **All-in-one AI + API backend**

Backend services include:

- Speech recognition (Whisper)
- Evaluation using LLM-based scoring logic
- Audio preprocessing
- Early support for TTS

---

# 🏗 **Project Structure**

```
STT-TTS-exam-portal/
│
├── backend/
│   └── fastapi_backend/
│        ├── app/
│        │    ├── routers/          # stt.py, evaluation.py, tts.py
│        │    ├── services/         # STT, TTS, evaluation logic
│        │    ├── schemas/          # Request/response models
│        │    └── main.py           # FastAPI entrypoint
│        ├── requirements.txt
│        ├── Dockerfile
│        └── ...
│
├── frontend/   # (Optional — basic placeholder or simple UI)
│   └── README.md (if applicable)
│
└── README.md
```

---

# 🐳 **Running Backend with Docker (Recommended)**

No Python installation required.  
Just clone → build → run.

### **1️⃣ Clone the repository**
```bash
git clone https://github.com/aryanshah2109/STT-TTS-exam-portal
cd STT-TTS-exam-portal/backend/fastapi_backend
```

### **2️⃣ Build the Docker image**
```bash
docker build -t examecho-backend .
```

### **3️⃣ Run the container**
```bash
docker run -p 8000:8000 examecho-backend
```

### **API Documentation**
Open in browser:
```
http://localhost:8000/docs
```

---

# 🖥 **Running Backend Locally (Without Docker)**

### **Prerequisites**
- Python 3.10+
- Pip

### **Steps**
```bash
cd backend/fastapi_backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

# 🧪 **API Endpoints**

## 🎤 **Speech-to-Text**
### `POST /stt/transcribe`
Uploads audio → returns text.

Example:
```bash
curl -X POST "http://localhost:8000/stt/transcribe" \
  -F "audio=@answer.wav"
```

---

## 🧠 **Answer Evaluation**
### `POST /evaluate/answer`
Input: question + student answer  
Output: score + justification

Example:
```bash
curl -X POST "http://localhost:8000/evaluate/answer" \
  -H "Content-Type: application/json" \
  -d '{"question_id":"1","question_text":"Explain X","student_answer":"...","max_marks":10}'
```

---

## 🔊 **Text-to-Speech**
Router exists; full implementation coming soon.

---

# 🎨 **Frontend (Minimal Section as Requested)**

The project includes a basic frontend directory.

To run (if applicable):

```bash
cd frontend
npm install
npm run dev
```

Frontend will communicate with backend at:

```
http://localhost:8000
```

---

# 🧱 **Architecture Overview**

```
┌────────────────────┐        ┌────────────────────────────┐
│     Frontend        │        │      FastAPI Backend        │
│  (React / Optional) │───────▶│ - STT Service               │
└────────────────────┘        │ - Evaluation Engine          │
                              │ - Audio/TTS Service          │
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
MIT License (or update as preferred)

---

# ✉️ **Contact**
For support or collaboration, open an Issue or reach out through GitHub.

---

