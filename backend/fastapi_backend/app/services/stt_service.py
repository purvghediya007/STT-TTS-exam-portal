import os
from tempfile import NamedTemporaryFile
from fastapi import UploadFile, HTTPException

from ai_ml.Speech2Text import STT
from app.config import settings

async def transcribe(audio: UploadFile, lang="en", model=None):
    model = model or settings.STT_DEFAULT_MODEL

    suffix = os.path.splitext(audio.filename or "")[-1] or ".wav"
    with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name

    stt = STT(lang=lang, model=model, audio_file_name=tmp_path)
    stt.transcribe()

    if not stt.transcription_list:
        raise HTTPException(
            status_code=400,
            detail="STT failed. No transcription returned. Check audio or model."
        )

    text = stt.transcription_list[0]

    try: 
        os.remove(tmp_path)
    except: 
        pass

    return text
