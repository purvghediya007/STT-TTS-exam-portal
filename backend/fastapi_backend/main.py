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
    """Load configured provider clients."""
    logger.info("Starting ExamEcho AI Service (%s/%s/%s) ...", settings.LLM_PROVIDER, settings.STT_PROVIDER, settings.TTS_PROVIDER)

    try:
        from ai_ml.provider_factory import get_stt_client
        app_state.stt_client = get_stt_client()
        app_state.groq_audio_client = app_state.stt_client
        logger.info("STT provider ready: %s", settings.STT_PROVIDER)
    except Exception as exc:
        logger.error("Groq audio client failed to load: %s", exc)
        logger.warning("  STT/TTS endpoints will not be functional.")

    try:
        from ai_ml.provider_factory import get_llm_model
        app_state.llm_model = get_llm_model()
        app_state.groq_model = app_state.llm_model
        logger.info("LLM provider ready: %s (%s)", settings.LLM_PROVIDER, settings.OPENAI_MODEL_NAME if settings.LLM_PROVIDER == "openai" else settings.GROQ_MODEL_NAME)
    except Exception as exc:
        logger.error("Groq model failed to load: %s", exc)
        logger.warning(
            "  Question generation, rubric generation, and answer evaluation will not be functional.\n"
            "  Check that GROQ_API_KEY is configured and the model name is valid."
        )

    try:
        from ai_ml.provider_factory import get_tts_engine
        app_state.tts_engine = get_tts_engine()
        logger.info("TTS provider ready: %s", settings.TTS_PROVIDER)
    except Exception as exc:
        logger.error("TTS provider failed to load: %s", exc)

    if app_state.is_ready:
        logger.info("All models loaded - service is fully ready.")
    else:
        ready = []
        if app_state.stt_ready:
            ready.append(f"STT ({settings.STT_PROVIDER})")
        if app_state.llm_ready:
            ready.append("LLM (question gen / eval / rubrics)")
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
            "llm": settings.LLM_PROVIDER,
            "model": settings.OPENAI_MODEL_NAME if settings.LLM_PROVIDER == "openai" else settings.GROQ_MODEL_NAME,
            "stt": settings.STT_PROVIDER,
            "stt_model": settings.ELEVENLABS_STT_MODEL_NAME if settings.STT_PROVIDER == "elevenlabs" else settings.GROQ_STT_MODEL_NAME,
            "tts": settings.TTS_PROVIDER,
            "tts_model": settings.OPENAI_TTS_MODEL_NAME if settings.TTS_PROVIDER == "openai" else settings.GROQ_TTS_MODEL_NAME,
        },
        "models": {
            "whisper": app_state.stt_ready,
            "stt": app_state.stt_ready,
            "llm": app_state.llm_ready,
        },
    }


@app.get(
    "/health/providers",
    tags=["Health"],
    summary="Provider connectivity check",
    description="Reports configured provider readiness.",
)
@app.get("/health/groq", include_in_schema=False)
def health_providers() -> dict:
    return {
        "providers": {"llm": settings.LLM_PROVIDER, "stt": settings.STT_PROVIDER, "tts": settings.TTS_PROVIDER},
        "ready": {"llm": app_state.llm_ready, "stt": app_state.stt_ready, "tts": app_state.tts_engine is not None},
        "models": {"llm": settings.OPENAI_MODEL_NAME if settings.LLM_PROVIDER == "openai" else settings.GROQ_MODEL_NAME,
                   "stt": settings.ELEVENLABS_STT_MODEL_NAME if settings.STT_PROVIDER == "elevenlabs" else settings.GROQ_STT_MODEL_NAME,
                   "tts": settings.OPENAI_TTS_MODEL_NAME if settings.TTS_PROVIDER == "openai" else settings.GROQ_TTS_MODEL_NAME},
    }
