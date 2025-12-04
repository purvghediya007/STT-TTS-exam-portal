from fastapi import APIRouter, UploadFile, File, HTTPException
from app.schemas.stt import STTResponse
from app.services.stt_service import transcribe

router = APIRouter(prefix="/stt", tags=["stt"])

ALLOWED = {
    "audio/wav", "audio/x-wav", "audio/mpeg",
    "audio/mp4", "audio/webm"
}

@router.post("/transcribe", response_model=STTResponse)
async def stt_route(audio: UploadFile = File(...), lang="en", model=None):
    if audio.content_type not in ALLOWED:
        raise HTTPException(400, f"Invalid audio type: {audio.content_type}")

    text = await transcribe(audio, lang, model)
    return STTResponse(text=text, language=lang, model=model)
