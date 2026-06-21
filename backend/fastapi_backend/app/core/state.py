"""Application-level state container."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class AppState:
    """Container for singleton model instances loaded at startup."""

    whisper_model: Optional[Any] = field(default=None)
    """Legacy Whisper model instance. Retained for backward compatibility."""

    groq_audio_client: Optional[Any] = field(default=None)
    """Groq SDK client used for STT and TTS."""

    groq_model: Optional[Any] = field(default=None)
    """LangChain-wrapped Groq model instance."""

    st_model: Optional[Any] = field(default=None)
    """SentenceTransformer model instance (for MCQ evaluation)."""

    @property
    def is_ready(self) -> bool:
        """Return ``True`` when all required runtime clients are loaded."""
        return all([
            self.groq_audio_client is not None,
            self.groq_model is not None,
            self.st_model is not None,
        ])

    @property
    def llm_ready(self) -> bool:
        """Return ``True`` when the Groq model is loaded."""
        return self.groq_model is not None

    @property
    def stt_ready(self) -> bool:
        """Return ``True`` when the Groq audio client is loaded."""
        return self.groq_audio_client is not None

    @property
    def mcq_ready(self) -> bool:
        """Return ``True`` when the SentenceTransformer model is loaded."""
        return self.st_model is not None


app_state = AppState()
