from fastapi import FastAPI
from app.routers import stt, evaluation,tts
from contextlib import asynccontextmanager

from ai_ml.Evaluation import EvaluationEngine
from ai_ml.Speech2Text import ModelGenerator

from dotenv import load_dotenv
load_dotenv()

whisper_model = None
qwen_model = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global whisper_model, qwen_model

    # Pre-load whisper model for STT
    whisper_model = ModelGenerator.whisper_model_generator()

    # Pre-load Qwen model for Evaluation
    qwen_model = EvaluationEngine(model_name="Qwen/Qwen2.5-3B-Instruct")

    yield

app = FastAPI(title="Examecho AI Service", lifespan=lifespan)

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(stt.router)
app.include_router(evaluation.router)