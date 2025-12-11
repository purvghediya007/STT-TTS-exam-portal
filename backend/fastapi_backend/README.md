# 🚀 FastAPI Backend - Examecho AI Service

A FastAPI-based backend service for the Examecho exam portal with Speech-to-Text (STT), Text-to-Speech (TTS), and answer evaluation capabilities.

---

## 📁 Project Structure

```
fastapi_backend/
├── app/                          # Main application
│   ├── main.py                     # FastAPI app entry point
│   ├── config.py                   # Configuration
│   ├── routers/                    # API routes
│   │   ├── stt.py                      # Speech-to-Text routes
│   │   ├── tts.py                      # Text-to-Speech routes
│   │   └── evaluation.py               # Answer evaluation routes
│   ├── schemas/                    # Pydantic models
│   ├── services/                   # Business logic
│   │   ├── stt_service.py
│   │   ├── tts_service.py
│   │   └── evaluation_service.py
│   └── core/models.py              # Shared model instances
├── ai_ml/                        # AI/ML models
│   ├── Speech2Text.py              # Whisper STT
│   ├── Text2Speech.py              # gTTS TTS
│   ├── Evaluation.py               # LLM evaluation
│   ├── AudioPreprocessor.py        # Audio utilities
│   └── AIExceptions.py             # Custom exceptions
├── generated_audio/              # Output audio files
├── Dockerfile                    # Docker setup
├── requirements.txt              # Dependencies
└── README.md
```

---

## 🚀 Quick Start

### 📦 Installation

```bash
# Clone repository
git clone https://github.com/aryanshah2109/STT-TTS-exam-portal.git
cd backend/fastapi_backend

# Setup virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### ▶️ Running

#### Local Development

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Docker

```bash
docker build -t examecho-backend .
docker run -p 8000:8000 examecho-backend
```

**Access API docs:** `http://localhost:8000/docs`

---

## 🔌 API Endpoints

### 💚 Health Check

```
GET /health
```

- **Response:** `{"status": "ok"}`

### 🎤 Speech-to-Text (STT)

```
POST /stt/transcribe
```

- **File:** Audio file (WAV, MP3, MP4, WebM)
- **Query Parameters:**
  - `lang` - Language code (default: `en`)
  - `model` - Model name (default: `whisper`)
- **Response:** 
  ```json
  {
    "text": "Transcribed text",
    "language": "en",
    "model": "whisper"
  }
  ```

### 🔊 Text-to-Speech (TTS)

```
POST /tts/synthesize
```

- **Request Body:**
  ```json
  {
    "text": "Hello world",
    "language": "en",
    "slow": false
  }
  ```
- **Response:**
  ```json
  {
    "text": "Hello world",
    "audio_path": "/generated_audio/audio_123.mp3",
    "language": "en"
  }
  ```

### ✅ Answer Evaluation

```
POST /evaluate/answer
```

- **Request Body:**
  ```json
  {
    "question_id": "q134",
    "question_text": "What is the capital of France?",
    "student_answer": "Paris",
    "marks": "20"
  }
  ```
- **Response:**
  ```json
  {
    "question_id": "q134",
    "score": 15,
    "strengths": [
        "The student answered the question very well",
        "The answer was according to the rubrics of the questions"
    ],
    "weakness": [
        "Answer can be more detailed",       
    ],
    "justification": "Correct answer!",
    "suggested_improvement": "Try to add more depth to the answer"
  }
  ```

---

## ⚙️ Configuration

Create `.env` file in the root directory:

```env
HF_EVAL_MODEL_NAME=microsoft/Phi-3.5-mini-instruct
STT_DEFAULT_MODEL=whisper
HF_TOKEN=your_token  # Optional
```

---

## 🏗️ Architecture Overview

**Layered Design:**

- **🌐 Routers:** Handle HTTP requests and input validation
- **📋 Schemas:** Pydantic models for request/response validation
- **⚙️ Services:** Business logic layer
- **🤖 AI/ML:** Model inference and audio processing
- **💾 Core Models:** Global model instances (Whisper, Phi-3.5)

**Model Lifecycle:** Models are preloaded on startup to reduce latency on first requests.

---

## ✨ Key Features

- ✅ Multi-language speech recognition (Whisper)
- ✅ Text-to-speech synthesis (gTTS)
- ✅ Intelligent answer evaluation (Phi-3.5 LLM)
- ✅ Audio preprocessing (noise reduction, VAD)
- ✅ Async request handling
- ✅ Docker containerization
- ✅ Swagger API documentation

---

## 📚 Dependencies

### Core Stack
- **Web Framework:** FastAPI, Uvicorn, Pydantic
- **AI/ML:** Whisper, Transformers, LangChain
- **Audio Processing:** Librosa, SoundFile, pydub, noisereduce
- **TTS:** gTTS
- **Utilities:** python-dotenv, numpy, scipy

See `requirements.txt` for complete list with versions.

---

## 🛠️ Development

### Code Structure

- ✓ Follow PEP 8 style guide
- ✓ Use type hints for functions
- ✓ Add docstrings for modules
- ✓ Use async/await for I/O operations

### Adding New Endpoints

**Steps:**

1. Create schema in `app/schemas/`
2. Create service in `app/services/`
3. Create router in `app/routers/`
4. Include router in `app/main.py`

**Example:**

```python
# app/routers/new_feature.py
from fastapi import APIRouter
from app.services.new_service import process_request

router = APIRouter(prefix="/new", tags=["new"])

@router.post("/endpoint")
async def new_endpoint(payload: RequestModel):
    result = process_request(payload)
    return ResponseModel(**result)
```

---

## 🔧 Troubleshooting

|--------------- Issue --------------|-----------------Solution--------------------|
|------------------------------------|---------------------------------------------|
| 📥 Model download errors          | Set `HF_TOKEN` for authenticated access      |
| 🎵 Audio format not supported     | Convert to WAV/MP3; check MIME types         |
| 💾 Out of memory                  | Use smaller models or increase RAM           |
| ⚠️ Port 8000 in use               | Use different port: `docker run -p 9000:8000`|

---

## 🌟 Production Deployment

Run with multiple workers for better performance:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## 📖 Resources

- **📦 Repository:** https://github.com/aryanshah2109/STT-TTS-exam-portal
- **📄 API Docs:** http://localhost:8000/docs
- **🔗 FastAPI Docs:** https://fastapi.tiangolo.com/

---

**Last Updated:** December 2025
