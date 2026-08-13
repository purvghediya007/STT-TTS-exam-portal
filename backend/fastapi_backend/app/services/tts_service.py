"""TTS service: bridges FastAPI route -> Groq-backed TTS module."""

from __future__ import annotations

import logging
import os
import hashlib
import shutil
from pathlib import Path

from ai_ml.tts import DirectTextSource, TTSConfig, TTSPipeline
from ai_ml.provider_factory import get_tts_engine
from app.config import settings
from ai_ml.usage_logger import log_usage

logger = logging.getLogger(__name__)


def generate_speech(*, text: str, question_id: str, language: str = "en", slow: bool = False) -> Path:
    """Synthesise speech from text and write to a named WAV file."""
    audio_dir = Path(settings.TTS_AUDIO_DIR)
    audio_dir.mkdir(parents=True, exist_ok=True)

    output_path = audio_dir / f"{question_id}.wav"
    cache_dir = audio_dir / ".tts_cache"
    voice = settings.OPENAI_TTS_VOICE if settings.TTS_PROVIDER == "openai" else settings.GROQ_TTS_VOICE
    cache_key = f"{settings.TTS_PROVIDER}:{voice}:{text}"
    cache_path = cache_dir / f"{hashlib.sha256(cache_key.encode()).hexdigest()}.wav"
    if settings.ENABLE_TTS_AUDIO_CACHE and cache_path.exists():
        shutil.copyfile(cache_path, output_path)
        logger.info("TTS cache hit for question_id=%s", question_id)
        return output_path

    config = TTSConfig(
        language=language,
        slow=slow,
        output_file=output_path,
        return_bytes=False,
        response_format=(settings.OPENAI_TTS_RESPONSE_FORMAT if settings.TTS_PROVIDER == "openai" else settings.GROQ_TTS_RESPONSE_FORMAT),
    )

    pipeline = TTSPipeline(
        source=DirectTextSource(text),
        engine=get_tts_engine(),
        config=config,
    )

    result_path = pipeline.run()
    if settings.ENABLE_TTS_AUDIO_CACHE:
        cache_dir.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(result_path, cache_path)
        logger.info("TTS cache miss; stored generated audio for question_id=%s", question_id)
    logger.info("TTS audio written to %s", result_path)
    log_usage(provider=settings.TTS_PROVIDER, task="tts", model=(settings.OPENAI_TTS_MODEL_NAME if settings.TTS_PROVIDER == "openai" else settings.GROQ_TTS_MODEL_NAME))
    return Path(result_path)


def delete_audio_file(path: str | Path) -> None:
    """Remove a generated audio file from disk."""
    try:
        os.unlink(path)
        logger.debug("Deleted TTS audio file: %s", path)
    except OSError as exc:
        logger.warning("Could not delete TTS audio file %s: %s", path, exc)
