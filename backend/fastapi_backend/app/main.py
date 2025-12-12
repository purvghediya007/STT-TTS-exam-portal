from fastapi import FastAPI
from app.routers import stt, evaluation, tts, question_generation
from contextlib import asynccontextmanager

from ai_ml.Evaluation import EvaluationEngine
from ai_ml.Speech2Text import SpeechModelGenerator
from ai_ml.QuestionsGenerator import QuestionsGenerator
from app.core import models

from dotenv import load_dotenv
load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # preload whisper model
    models.whisper_model = SpeechModelGenerator.whisper_model_generator()

    # preload model
    models.ai_model = EvaluationEngine("microsoft/Phi-3.5-mini-instruct")

    # force download during startup
    models.ai_model.get_model()

    yield

app = FastAPI(title="Examecho AI Service", lifespan=lifespan)

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(question_generation.router)
app.include_router(stt.router)
app.include_router(evaluation.router)
app.include_router(tts.router)
