"""STT service: bridges FastAPI route -> Groq-backed STT module."""

from __future__ import annotations

import logging
import os
import tempfile

from fastapi import UploadFile

from ai_ml.model_creator import GroqAudioClientLoader
from ai_ml.stt import STT
from app.config import settings
from app.core.state import app_state

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

        groq_client = app_state.groq_audio_client or GroqAudioClientLoader.get_client()
        if chosen_model == "groq":
            text = STT.transcribe_with_model(
                model=groq_client,
                audio_path=tmp_path,
                lang=lang,
            )
        else:
            stt = STT(lang=lang, model=chosen_model, audio_file_path=tmp_path)
            text = stt.transcribe()

        logger.info("Transcription complete: %d chars", len(text or ""))
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
