"""TTS (Text-to-Speech) router."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException
from fastapi.background import BackgroundTasks
from fastapi.responses import FileResponse

from ai_ml.exceptions import TTSError
from app.schemas.tts import TTSRequest
from app.services.tts_service import delete_audio_file, generate_speech

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tts", tags=["Text-to-Speech"])


@router.post(
    "/synthesize",
    summary="Convert text to speech",
    description=(
        "Synthesise speech from the provided text and return a WAV audio file. "
        "The generated file is streamed to the client and automatically deleted "
        "from the server after the response is sent."
    ),
    response_class=FileResponse,
    responses={
        200: {"content": {"audio/wav": {}}, "description": "WAV audio file."},
        400: {"description": "Empty or invalid text."},
        500: {"description": "TTS synthesis failed."},
    },
)
async def synthesize_endpoint(payload: TTSRequest, background_tasks: BackgroundTasks) -> FileResponse:
    """Convert text to a WAV audio file."""
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    try:
        audio_path = generate_speech(
            text=payload.text,
            question_id=payload.question_id,
            language=payload.language,
            slow=payload.slow,
        )
    except TTSError as exc:
        logger.error("TTS synthesis error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Speech synthesis failed: {exc}") from exc
    except Exception as exc:
        logger.exception("Unexpected TTS error")
        raise HTTPException(status_code=500, detail="Speech synthesis failed due to an internal error.") from exc

    background_tasks.add_task(delete_audio_file, audio_path)

    return FileResponse(
        path=str(audio_path),
        media_type="audio/wav",
        filename=f"{payload.question_id}.wav",
    )
