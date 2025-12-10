from fastapi import APIRouter, HTTPException
from app.schemas.tts import TTSRequest, TTSResponse
from app.services.tts_service import generate_tts_audio

router = APIRouter(prefix="/tts", tags=["tts"])

@router.post("/synthesize", response_model=TTSResponse)
async def synthesize(payload: TTSRequest):
    if not payload.text.strip():
        raise HTTPException(400, "Text cannot be empty")

    audio_path = generate_tts_audio(
        text=payload.text,
        language=payload.language,
        slow=payload.slow
    )

    return TTSResponse(
        text=payload.text,
        audio_path=audio_path,
        language=payload.language
    )
