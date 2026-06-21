"""Speech-to-Text helpers backed by the Groq audio API."""

from __future__ import annotations

import logging
from pathlib import Path
import warnings

warnings.filterwarnings("ignore")

from ai_ml.audio_preprocessor import AudioPreprocessor
from ai_ml.exceptions import AudioProcessingError, IllegalModelSelectionError
from ai_ml.model_creator import GroqAudioClientLoader
from app.config import settings

logger = logging.getLogger(__name__)


class STT:
    """Speech-to-Text helper.

    The public API stays stable, but every supported backend now routes to
    Groq transcription under the hood. Legacy model aliases are accepted for
    backward compatibility.
    """

    SUPPORTED_MODELS = ("groq", "whisper", "hf")

    def __init__(self, lang: str = "en", model: str = "whisper", audio_file_path: str = "") -> None:
        self.lang = lang.lower()
        self.model = model.lower()
        self.audio_file_path = audio_file_path

    @staticmethod
    def transcribe_with_model(model, audio_path: str, lang: str = "en") -> str:
        """Transcribe audio using a preloaded Groq SDK client instance."""
        preprocessor = AudioPreprocessor()
        result = preprocessor.preprocess_file(audio_path)
        processed_path = result.metadata.processed_path

        try:
            client = model or GroqAudioClientLoader.get_client()
            return STT._transcribe_with_groq_client(client, processed_path, lang)
        except AudioProcessingError:
            raise
        except Exception as exc:
            logger.error("Groq transcription error: %s", exc)
            raise AudioProcessingError(str(exc)) from exc

    def transcribe(self) -> str:
        """
        Transcribe audio using the backend specified in ``self.model``.

        Returns:
            Transcribed text string, or empty string on failure.

        Raises:
            IllegalModelSelectionError: If the requested model is unsupported.
            AudioProcessingError: If preprocessing or transcription fails.
        """
        if self.model not in self.SUPPORTED_MODELS:
            raise IllegalModelSelectionError(
                f"Unsupported STT model '{self.model}'. "
                f"Choose one of: {self.SUPPORTED_MODELS}."
            )

        return self._groq_transcribe()

    def _groq_transcribe(self) -> str:
        groq_client = GroqAudioClientLoader.get_client()
        return STT.transcribe_with_model(groq_client, self.audio_file_path, self.lang)

    def _hf_transcribe(self) -> str:
        """Legacy alias retained for compatibility; now routes to Groq."""
        logger.debug("STT model 'hf' is deprecated; routing to Groq transcription.")
        return self._groq_transcribe()

    @staticmethod
    def _transcribe_with_groq_client(client, audio_path: str, lang: str) -> str:
        audio_file = Path(audio_path)

        try:
            with audio_file.open("rb") as handle:
                output = client.audio.transcriptions.create(
                    file=handle,
                    model=settings.GROQ_STT_MODEL_NAME,
                    language=lang,
                )
        except Exception as exc:
            raise STT._translate_groq_error(exc, "transcription") from exc

        text = STT._extract_text(output)
        if not text:
            logger.warning("Groq transcription returned no text.")
        else:
            logger.debug("Transcription result (%d chars)", len(text))
        return text

    @staticmethod
    def _extract_text(output) -> str:
        if isinstance(output, dict):
            return str(output.get("text", "")).strip()
        return str(getattr(output, "text", "") or "").strip()

    @staticmethod
    def _translate_groq_error(exc: Exception, operation: str) -> AudioProcessingError:
        status_code = getattr(exc, "status_code", None)
        if status_code is None:
            response = getattr(exc, "response", None)
            status_code = getattr(response, "status_code", None)

        message = str(exc).strip() or "Unknown Groq error"
        lower_message = message.lower()
        lower_name = exc.__class__.__name__.lower()

        if status_code in (401, 403) or "auth" in lower_message or "auth" in lower_name:
            message = (
                f"Groq authentication failed during {operation}. "
                "Check GROQ_API_KEY and try again."
            )
        elif status_code == 429 or "rate limit" in lower_message or "ratelimit" in lower_name:
            message = (
                f"Groq rate limit reached during {operation}. "
                "Retry after a short delay."
            )
        elif status_code and 500 <= int(status_code) < 600:
            message = f"Groq service error during {operation}: {message}"
        else:
            message = f"Groq {operation} failed: {message}"

        return AudioProcessingError(message)
