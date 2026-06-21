# ExamEcho AI Service

AI microservice for the ExamEcho platform.

The service now uses Groq for:
- Speech-to-Text
- Text-to-Speech
- LLM-based question generation
- Rubric generation
- Answer evaluation

It also keeps local SentenceTransformer support for MCQ evaluation.

## What’s included

- `POST /api/v1/stt/transcribe`
- `POST /api/v1/tts/synthesize`
- `POST /api/v1/questions/generate`
- `POST /api/v1/rubrics/create`
- `POST /api/v1/evaluate/answer`
- `POST /api/v1/mcq/evaluate`
- `GET /health`
- `GET /health/groq`

## Requirements

- Python 3.11+
- Groq API key
- `ffmpeg` installed on the host or in the container
- Optional: Docker and Docker Compose

## Environment variables

Create a `.env` file with at least:

```env
GROQ_API_KEY=...
GROQ_API_BASE_URL=https://api.groq.com
GROQ_MODEL_NAME=llama-3.3-70b-versatile
GROQ_TEMPERATURE=0.0
GROQ_MAX_TOKENS=2048
GROQ_STT_MODEL_NAME=whisper-large-v3
GROQ_TTS_MODEL_NAME=canopylabs/orpheus-v1-english
GROQ_TTS_VOICE=autumn
GROQ_TTS_RESPONSE_FORMAT=wav
STT_DEFAULT_MODEL=groq
TTS_AUDIO_DIR=generated_audio
MCQ_EVAL_MODEL_NAME=sentence-transformers/all-MiniLM-L6-v2
MCQ_SIMILARITY_THRESHOLD=0.75
CORS_ORIGINS=["*"]
API_V1_PREFIX=/api/v1
APP_TITLE=ExamEcho AI Service
APP_VERSION=3.0.0
```

## Local setup

```bash
git clone <repo>
cd examecho_ai_ollama

python -m venv .venv
.venv\Scripts\activate

pip install -r requirements.txt
copy .env.example .env

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Docker

Build and run:

```bash
docker compose up --build
```

The container exposes the API on port `8000` and stores generated audio in
`./generated_audio`.

## STT notes

- Accepted MIME types:
  - `audio/wav`
  - `audio/x-wav`
  - `audio/mpeg`
  - `audio/mp4`
  - `audio/webm`
  - `video/webm`
  - `audio/ogg`
- Browser-recorded WebM uploads are supported.

## TTS notes

- The current Groq TTS model expects:
  - `response_format=wav`
  - voices: `autumn`, `diana`, `hannah`, `austin`, `daniel`, `troy`
- The API returns a WAV file, not MP3.

## Quick API examples

### STT

```bash
curl -X POST "http://localhost:8000/api/v1/stt/transcribe?lang=en&model=groq" \
  -F "audio=@answer.webm;type=video/webm"
```

### TTS

```bash
curl -X POST http://localhost:8000/api/v1/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "question_id": "q_001",
    "text": "Explain supervised and unsupervised learning.",
    "language": "en",
    "slow": false
  }' --output q_001.wav
```

## Health checks

```bash
curl http://localhost:8000/health
curl http://localhost:8000/health/groq
```

## Troubleshooting

- `401` or `403`: check `GROQ_API_KEY`
- `429`: retry later, you hit a rate limit
- `400 voice must be one of...`: use one of the supported voices listed above
- `400 response_format must be one of [wav]`: keep `GROQ_TTS_RESPONSE_FORMAT=wav`
- `415 unsupported audio type`: send one of the accepted audio MIME types

## Project layout

```text
ai_ml/        core STT, TTS, evaluation logic
app/          FastAPI config, routers, schemas, services
main.py       application entrypoint
requirements.txt
Dockerfile
docker-compose.yml
```
