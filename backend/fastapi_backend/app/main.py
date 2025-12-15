from fastapi import FastAPI
from app.routers import stt, evaluation, tts, question_generation, rubrics, mcq_evaluation
from contextlib import asynccontextmanager

from ai_ml.ModelCreator import HFModelCreation
from ai_ml.Speech2Text import SpeechModelGenerator
from ai_ml.MCQEvaluation import MCQEvaluationEngine
from app.core import models

from app.config import settings

from dotenv import load_dotenv
load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # preload whisper model
    models.whisper_model = SpeechModelGenerator.whisper_model_generator()

    # preload AI model ONCE - shared across all services
    models.ai_model = HFModelCreation.hf_model_creator(settings.HF_EVAL_MODEL_NAME)

    # preload Sentence Transformers model for similarity score
    models.st_model = MCQEvaluationEngine(settings.MCQ_EVAL_MODEL_NAME)

    yield

app = FastAPI(title="Examecho AI Service", lifespan=lifespan)

@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(question_generation.router)
app.include_router(rubrics.router)
app.include_router(tts.router)
app.include_router(stt.router)
app.include_router(evaluation.router)
app.include_router(mcq_evaluation.router)

