from fastapi import FastAPI
from app.routers import stt, evaluation, tts
from contextlib import asynccontextmanager

from ai_ml.Evaluation import EvaluationEngine
from ai_ml.Speech2Text import ModelGenerator
from app.core import models

from dotenv import load_dotenv
load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # preload whisper model
    models.whisper_model = ModelGenerator.whisper_model_generator()

    # preload Qwen model
    models.qwen_model = EvaluationEngine("Qwen/Qwen2-1.5B-Instruct")


    # force Qwen download during startup
    models.qwen_model.get_model()

    yield

app = FastAPI(title="Examecho AI Service", lifespan=lifespan)

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(stt.router)
app.include_router(evaluation.router)
