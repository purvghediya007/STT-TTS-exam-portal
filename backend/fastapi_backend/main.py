"""ExamEcho AI Service - FastAPI application entrypoint."""

from __future__ import annotations

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.state import app_state

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the Groq audio client, Groq LLM wrapper, and SentenceTransformer."""
    logger.info("Starting ExamEcho AI Service (Groq edition) ...")
    logger.info("  Groq model: %s", settings.GROQ_MODEL_NAME)
    logger.info("  Groq STT model: %s", settings.GROQ_STT_MODEL_NAME)
    logger.info("  Groq TTS model: %s", settings.GROQ_TTS_MODEL_NAME)

    try:
        from ai_ml.model_creator import GroqAudioClientLoader

        app_state.groq_audio_client = GroqAudioClientLoader.get_client()
        logger.info("Groq audio client ready")
    except Exception as exc:
        logger.error("Groq audio client failed to load: %s", exc)
        logger.warning("  STT/TTS endpoints will not be functional.")

    try:
        from ai_ml.model_creator import GroqModelLoader

        app_state.groq_model = GroqModelLoader.get_model()
        logger.info("Groq model '%s' ready", settings.GROQ_MODEL_NAME)
    except Exception as exc:
        logger.error("Groq model failed to load: %s", exc)
        logger.warning(
            "  Question generation, rubric generation, and answer evaluation will not be functional.\n"
            "  Check that GROQ_API_KEY is configured and the model name is valid."
        )

    try:
        from sentence_transformers import SentenceTransformer

        logger.info("Loading SentenceTransformer '%s' ...", settings.MCQ_EVAL_MODEL_NAME)
        app_state.st_model = SentenceTransformer(settings.MCQ_EVAL_MODEL_NAME)
        logger.info("SentenceTransformer ready")
    except Exception as exc:
        logger.error("SentenceTransformer failed to load: %s", exc)
        logger.warning("  MCQ evaluation endpoints will not be functional.")

    if app_state.is_ready:
        logger.info("All models loaded - service is fully ready.")
    else:
        ready = []
        if app_state.stt_ready:
            ready.append("STT (Groq)")
        if app_state.llm_ready:
            ready.append("LLM (question gen / eval / rubrics)")
        if app_state.mcq_ready:
            ready.append("MCQ evaluation")
        logger.warning(
            "Service started in DEGRADED state. Functional: [%s]. Check logs above for errors.",
            ", ".join(ready) if ready else "none",
        )

    yield

    logger.info("Shutting down ExamEcho AI Service.")


app = FastAPI(
    title=settings.APP_TITLE,
    version=settings.APP_VERSION,
    description=settings.APP_DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import (  # noqa: E402
    evaluation,
    mcq_evaluation,
    question_generator,
    mcq_generator,
    rubrics,
    stt,
    tts,
)

for router in [
    stt.router,
    tts.router,
    evaluation.router,
    rubrics.router,
    mcq_evaluation.router,
    question_generator.router,
    mcq_generator.router,
]:
    app.include_router(router, prefix=settings.API_V1_PREFIX)


@app.get(
    "/health",
    tags=["Health"],
    summary="Service health check",
    description=(
        "Returns the overall service status and per-model readiness. "
        "Use this for Kubernetes liveness / readiness probes."
    ),
)
def health_check() -> dict:
    """Returns HTTP 200 with model-readiness information."""
    return {
        "status": "ok" if app_state.is_ready else "degraded",
        "version": settings.APP_VERSION,
        "backend": {
            "llm": "groq",
            "model": settings.GROQ_MODEL_NAME,
            "api_url": settings.GROQ_API_BASE_URL,
            "stt": "groq",
            "tts": "groq",
        },
        "models": {
            "whisper": app_state.stt_ready,
            "stt": app_state.stt_ready,
            "groq": app_state.llm_ready,
            "sentence_transformer": app_state.mcq_ready,
        },
    }


@app.get(
    "/health/groq",
    tags=["Health"],
    summary="Groq connectivity check",
    description="Probes the configured Groq clients and returns their readiness status.",
)
def health_groq() -> dict:
    """Live probe of the Groq configuration."""
    from ai_ml.exceptions import GroqConnectionError, ModelLoadError
    from ai_ml.model_creator import GroqAudioClientLoader, GroqModelLoader

    result: dict = {
        "api_url": settings.GROQ_API_BASE_URL,
        "model": settings.GROQ_MODEL_NAME,
        "audio_model": settings.GROQ_STT_MODEL_NAME,
        "server_reachable": False,
        "model_available": False,
        "audio_ready": False,
        "error": None,
    }

    try:
        GroqAudioClientLoader.get_client()
        GroqModelLoader.get_model()
        result["server_reachable"] = True
        result["model_available"] = True
        result["audio_ready"] = True
    except GroqConnectionError as exc:
        result["error"] = str(exc)
    except ModelLoadError as exc:
        result["error"] = str(exc)

    return result
