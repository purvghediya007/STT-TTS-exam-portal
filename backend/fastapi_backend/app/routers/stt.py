"""STT (Speech-to-Text) router."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query, UploadFile, File

from ai_ml.exceptions import AudioProcessingError, IllegalModelSelectionError
from app.schemas.stt import STTResponse
from app.services.stt_service import ALLOWED_CONTENT_TYPES, transcribe_audio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stt", tags=["Speech-to-Text"])


@router.post(
    "/transcribe",
    response_model=STTResponse,
    summary="Transcribe audio to text",
    description=(
        "Upload an audio file and receive its transcription as plain text. "
        "Supported formats: WAV, MP3, MP4, WebM, OGG. "
        "Groq transcription is used by default. Legacy model aliases are accepted."
    ),
)
async def transcribe_endpoint(
    audio: UploadFile = File(..., description="Audio file to transcribe."),
    lang: str = Query(default="en", description="BCP-47 language code (e.g. 'en', 'hi')."),
    model: str = Query(default="groq", description="STT backend alias. Groq is used for all supported values."),
) -> STTResponse:
    """Transcribe an uploaded audio file to text."""
    if audio.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail=(
                f"Unsupported audio type '{audio.content_type}'. "
                f"Accepted types: {sorted(ALLOWED_CONTENT_TYPES)}."
            ),
        )

    try:
        text = await transcribe_audio(audio, lang=lang, model=model)
    except IllegalModelSelectionError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except AudioProcessingError as exc:
        logger.error("STT processing error: %s", exc)
        raise HTTPException(status_code=422, detail=f"Audio processing failed: {exc}")
    except Exception as exc:
        logger.exception("Unexpected STT error")
        raise HTTPException(status_code=500, detail="Transcription failed due to an internal error.") from exc

    return STTResponse(text=text, language=lang, model="groq")
