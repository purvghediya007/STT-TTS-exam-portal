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

    llm_model: Optional[Any] = field(default=None)
    stt_client: Optional[Any] = field(default=None)
    tts_engine: Optional[Any] = field(default=None)

    @property
    def is_ready(self) -> bool:
        """Return ``True`` when all required runtime clients are loaded."""
        return all([
            self.stt_client is not None,
            self.llm_model is not None,
        ])

    @property
    def llm_ready(self) -> bool:
        """Return ``True`` when the Groq model is loaded."""
        return self.llm_model is not None

    @property
    def stt_ready(self) -> bool:
        """Return ``True`` when the Groq audio client is loaded."""
        return self.stt_client is not None

app_state = AppState()
