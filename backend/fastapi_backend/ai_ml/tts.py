"""Text-to-Speech helpers backed by the Groq audio API."""

from __future__ import annotations

import logging
import tempfile
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Union

from ai_ml.exceptions import EngineError, TextSourceError, TTSError
from ai_ml.model_creator import GroqAudioClientLoader
from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class TTSConfig:
    """Parameters controlling TTS synthesis behaviour."""

    language: str = "en"
    slow: bool = False
    output_file: Optional[Path] = None
    return_bytes: bool = False
    voice: Optional[str] = None
    response_format: Optional[str] = None


class TextSource(ABC):
    """Abstract provider for the text to be synthesised."""

    @abstractmethod
    def get_text(self) -> str: ...


class DirectTextSource(TextSource):
    """Wraps an in-memory string."""

    def __init__(self, text: str) -> None:
        self._text = text.strip()

    def get_text(self) -> str:
        if not self._text:
            raise TextSourceError("Provided text is empty.")
        return self._text


class FileTextSource(TextSource):
    """Reads text from a UTF-8 encoded file."""

    def __init__(self, path: Path) -> None:
        self._path = path.resolve()

    def get_text(self) -> str:
        if not self._path.exists():
            raise TextSourceError(f"Text file not found: {self._path}")
        try:
            text = self._path.read_text(encoding="utf-8").strip()
        except OSError as exc:
            raise TextSourceError(f"Could not read text file: {exc}") from exc
        if not text:
            raise TextSourceError(f"Text file is empty: {self._path}")
        return text


class TTSEngine(ABC):
    """Abstract TTS synthesis backend."""

    @abstractmethod
    def synthesize(self, text: str, config: TTSConfig) -> Union[bytes, Path]: ...


class GroqTTSEngine(TTSEngine):
    """TTS engine backed by Groq's speech endpoint."""

    ALLOWED_VOICES = ("autumn", "diana", "hannah", "austin", "daniel", "troy")
    DEFAULT_VOICE = "autumn"
    ALLOWED_RESPONSE_FORMATS = ("wav",)
    DEFAULT_RESPONSE_FORMAT = "wav"

    def synthesize(self, text: str, config: TTSConfig) -> Union[bytes, Path]:
        if not text:
            raise EngineError("Cannot synthesise empty text.")

        try:
            client = GroqAudioClientLoader.get_client()
            voice = self._resolve_voice(config.voice or settings.GROQ_TTS_VOICE)
            response_format = self._resolve_response_format(
                config.response_format or settings.GROQ_TTS_RESPONSE_FORMAT
            )
            response = client.audio.speech.create(
                model=settings.GROQ_TTS_MODEL_NAME,
                voice=voice,
                input=text,
                response_format=response_format,
            )
        except Exception as exc:
            raise self._translate_groq_error(exc, "speech synthesis") from exc

        if config.return_bytes:
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{response_format}") as tmp:
                temp_path = Path(tmp.name)

            try:
                self._write_response_to_path(response, temp_path)
                audio_bytes = temp_path.read_bytes()
            except Exception as exc:
                raise self._translate_groq_error(exc, "buffer generation") from exc
            finally:
                temp_path.unlink(missing_ok=True)

            logger.debug("TTS: generated %d bytes for '%s...'", len(audio_bytes), text[:40])
            return audio_bytes

        if not config.output_file:
            raise EngineError("output_file must be set when return_bytes=False.")

        output = config.output_file.resolve()
        output.parent.mkdir(parents=True, exist_ok=True)

        try:
            self._write_response_to_path(response, output)
        except Exception as exc:
            raise self._translate_groq_error(exc, "file write") from exc

        logger.debug("TTS: audio saved to %s", output)
        return output

    @classmethod
    def _resolve_voice(cls, voice: str | None) -> str:
        candidate = (voice or "").strip().lower()
        if candidate in cls.ALLOWED_VOICES:
            return candidate

        if candidate:
            logger.warning(
                "Unsupported Groq TTS voice '%s'; falling back to '%s'.",
                candidate,
                cls.DEFAULT_VOICE,
            )
        return cls.DEFAULT_VOICE

    @classmethod
    def _resolve_response_format(cls, response_format: str | None) -> str:
        candidate = (response_format or "").strip().lower()
        if candidate in cls.ALLOWED_RESPONSE_FORMATS:
            return candidate

        if candidate:
            logger.warning(
                "Unsupported Groq TTS response_format '%s'; falling back to '%s'.",
                candidate,
                cls.DEFAULT_RESPONSE_FORMAT,
            )
        return cls.DEFAULT_RESPONSE_FORMAT

    @staticmethod
    def _write_response_to_path(response, output: Path) -> None:
        if hasattr(response, "stream_to_file"):
            response.stream_to_file(str(output))
            return
        if hasattr(response, "write_to_file"):
            response.write_to_file(str(output))
            return
        if hasattr(response, "save"):
            response.save(str(output))
            return

        if isinstance(response, (bytes, bytearray)):
            output.write_bytes(bytes(response))
            return

        content = getattr(response, "content", None)
        if isinstance(content, (bytes, bytearray)):
            output.write_bytes(bytes(content))
            return

        read_method = getattr(response, "read", None)
        if callable(read_method):
            maybe_bytes = read_method()
            if isinstance(maybe_bytes, (bytes, bytearray)):
                output.write_bytes(bytes(maybe_bytes))
                return

        raise EngineError("Unexpected Groq TTS response format.")

    @staticmethod
    def _translate_groq_error(exc: Exception, operation: str) -> EngineError:
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

        return EngineError(message)


class TTSPipeline:
    """Orchestrates text retrieval -> synthesis."""

    def __init__(self, source: TextSource, engine: TTSEngine, config: TTSConfig) -> None:
        self.source = source
        self.engine = engine
        self.config = config

    def run(self) -> Union[bytes, Path]:
        """
        Execute the pipeline.

        Returns:
            MP3 bytes if ``config.return_bytes=True``, otherwise the output path.

        Raises:
            TTSError: On any TTS failure.
        """
        try:
            text = self.source.get_text()
            return self.engine.synthesize(text, self.config)
        except TTSError:
            raise
        except Exception as exc:
            raise TTSError(f"TTS pipeline error: {exc}") from exc


GTTSEngine = GroqTTSEngine
