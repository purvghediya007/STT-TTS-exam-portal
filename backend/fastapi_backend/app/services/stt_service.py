import os
from tempfile import NamedTemporaryFile
from fastapi import UploadFile, HTTPException

from ai_ml.Speech2Text import STT
from app.config import settings
from app.core.models import whisper_model

async def transcribe(audio: UploadFile, lang="en", model=None):
    model = model or settings.STT_DEFAULT_MODEL  # usually "whisper"

    suffix = os.path.splitext(audio.filename or "")[-1] or ".wav"
    with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name

    stt = STT(lang=lang, model=model, audio_file_name=tmp_path)

    if model.lower() == "whisper":
        try:
            text = stt.transcribe_with_existing_model(
                whisper_model,
                audio_file_path=tmp_path,
                lang=lang
            )
        except Exception as e:
            try:
                os.remove(tmp_path)
            except:
                pass
            raise HTTPException(500, f"Whisper transcription failed: {str(e)}")

    elif model.lower() == "hf":
        stt.transcribe()
        text = stt.transcription_list[0] if stt.transcription_list else ""

    else:
        try:
            os.remove(tmp_path)
        except:
            pass
        raise HTTPException(
            status_code=400,
            detail=f"Invalid STT model '{model}'. Choose 'whisper' or 'hf'."
        )

    if not text:
        try:
            os.remove(tmp_path)
        except:
            pass
        raise HTTPException(
            status_code=500,
            detail="Speech-to-text failed. No transcription returned."
        )

    try:
        os.remove(tmp_path)
    except:
        pass

    return text
