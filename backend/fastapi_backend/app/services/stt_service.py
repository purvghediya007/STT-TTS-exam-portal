"""STT service: bridges FastAPI route -> Groq-backed STT module."""

from __future__ import annotations

import logging
import os
import tempfile

from fastapi import UploadFile

from ai_ml.provider_factory import get_stt_client
from ai_ml.stt import STT
from app.config import settings
from app.core.state import app_state
from ai_ml.usage_logger import log_usage

logger = logging.getLogger(__name__)

ALLOWED_CONTENT_TYPES = {
    "audio/wav",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp4",
    "audio/webm",
    "video/webm",
    "audio/ogg",
}


async def transcribe_audio(
    audio: UploadFile,
    lang: str = "en",
    model: str | None = None,
) -> str:
    """Save the uploaded audio to a temp file, transcribe it, then clean up."""
    chosen_model = model or settings.STT_DEFAULT_MODEL

    suffix = _extension_from_content_type(audio.content_type)
    tmp_path: str | None = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_path = tmp.name
            content = await audio.read()
            tmp.write(content)

        logger.debug(
            "Saved upload to temp file %s (%d bytes), model=%s, lang=%s",
            tmp_path,
            len(content),
            chosen_model,
            lang,
        )

        client = app_state.stt_client or get_stt_client()
        text = STT.transcribe_with_model(client, tmp_path, lang) if chosen_model == settings.STT_PROVIDER else STT(lang=lang, model=chosen_model, audio_file_path=tmp_path).transcribe()

        logger.info("Transcription complete: %d chars", len(text or ""))
        log_usage(provider=settings.STT_PROVIDER, task="stt", model=(settings.ELEVENLABS_STT_MODEL_NAME if settings.STT_PROVIDER == "elevenlabs" else settings.GROQ_STT_MODEL_NAME))
        return text or ""

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
            logger.debug("Deleted temp audio file: %s", tmp_path)


def _extension_from_content_type(content_type: str | None) -> str:
    """Map MIME type to a file extension for temp file naming."""
    mapping = {
        "audio/wav": ".wav",
        "audio/x-wav": ".wav",
        "audio/mpeg": ".mp3",
        "audio/mp4": ".mp4",
        "audio/webm": ".webm",
        "video/webm": ".webm",
        "audio/ogg": ".ogg",
    }
    return mapping.get(content_type or "", ".wav")
