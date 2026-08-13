"""Speech-to-text using configured ElevenLabs Scribe or Groq fallback."""
from __future__ import annotations

from pathlib import Path

from ai_ml.audio_preprocessor import AudioPreprocessor
from ai_ml.exceptions import AudioProcessingError, IllegalModelSelectionError
from ai_ml.model_creator import GroqAudioClientLoader
from ai_ml.provider_errors import translate_elevenlabs_error
from app.config import settings


class STT:
    SUPPORTED_MODELS = ("elevenlabs", "groq", "whisper", "hf")

    def __init__(self, lang: str = "en", model: str = "elevenlabs", audio_file_path: str = "") -> None:
        self.lang, self.model, self.audio_file_path = lang.lower(), model.lower(), audio_file_path

    @staticmethod
    def transcribe_with_model(client, audio_path: str, lang: str = "en") -> str:
        processed = AudioPreprocessor().preprocess_file(audio_path).metadata.processed_path
        if hasattr(client, "speech_to_text"):
            return STT._transcribe_with_elevenlabs(client, processed, lang)
        return STT._transcribe_with_groq_client(client or GroqAudioClientLoader.get_client(), processed, lang)

    def transcribe(self) -> str:
        if self.model not in self.SUPPORTED_MODELS:
            raise IllegalModelSelectionError(f"Unsupported STT model '{self.model}'. Choose one of: {self.SUPPORTED_MODELS}.")
        if self.model in ("groq", "whisper", "hf"):
            client = GroqAudioClientLoader.get_client()
        else:
            from ai_ml.provider_factory import get_stt_client
            client = get_stt_client()
        return self.transcribe_with_model(client, self.audio_file_path, self.lang)

    @staticmethod
    def _transcribe_with_elevenlabs(client, audio_path: str, lang: str) -> str:
        try:
            with Path(audio_path).open("rb") as handle:
                response = client.speech_to_text.convert(file=handle, model_id=settings.ELEVENLABS_STT_MODEL_NAME, language_code=lang)
        except Exception as exc:
            raise translate_elevenlabs_error(exc, "transcription") from exc
        return STT._extract_text(response)

    @staticmethod
    def _transcribe_with_groq_client(client, audio_path: str, lang: str) -> str:
        try:
            with Path(audio_path).open("rb") as handle:
                response = client.audio.transcriptions.create(file=handle, model=settings.GROQ_STT_MODEL_NAME, language=lang)
        except Exception as exc:
            raise STT._translate_groq_error(exc, "transcription") from exc
        return STT._extract_text(response)

    @staticmethod
    def _extract_text(output) -> str:
        return str(output.get("text", "") if isinstance(output, dict) else getattr(output, "text", "") or "").strip()

    @staticmethod
    def _translate_groq_error(exc: Exception, operation: str) -> AudioProcessingError:
        status = getattr(exc, "status_code", None) or getattr(getattr(exc, "response", None), "status_code", None)
        message = str(exc).strip() or "Unknown Groq error"
        if status in (401, 403):
            message = f"Groq authentication failed during {operation}. Check GROQ_API_KEY."
        elif status == 429:
            message = f"Groq rate limit reached during {operation}. Retry after a short delay."
        elif status and 500 <= int(status) < 600:
            message = f"Groq service error during {operation}: {message}"
        else:
            message = f"Groq {operation} failed: {message}"
        return AudioProcessingError(message)
