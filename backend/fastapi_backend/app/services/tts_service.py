"""TTS service: bridges FastAPI route -> Groq-backed TTS module."""

from __future__ import annotations

import logging
import os
from pathlib import Path

from ai_ml.tts import GTTSEngine, DirectTextSource, TTSConfig, TTSPipeline
from app.config import settings

logger = logging.getLogger(__name__)


def generate_speech(*, text: str, question_id: str, language: str = "en", slow: bool = False) -> Path:
    """Synthesise speech from text and write to a named WAV file."""
    audio_dir = Path(settings.TTS_AUDIO_DIR)
    audio_dir.mkdir(parents=True, exist_ok=True)

    output_path = audio_dir / f"{question_id}.wav"

    config = TTSConfig(
        language=language,
        slow=slow,
        output_file=output_path,
        return_bytes=False,
        response_format=settings.GROQ_TTS_RESPONSE_FORMAT,
    )

    pipeline = TTSPipeline(
        source=DirectTextSource(text),
        engine=GTTSEngine(),
        config=config,
    )

    result_path = pipeline.run()
    logger.info("TTS audio written to %s", result_path)
    return Path(result_path)


def delete_audio_file(path: str | Path) -> None:
    """Remove a generated audio file from disk."""
    try:
        os.unlink(path)
        logger.debug("Deleted TTS audio file: %s", path)
    except OSError as exc:
        logger.warning("Could not delete TTS audio file %s: %s", path, exc)
