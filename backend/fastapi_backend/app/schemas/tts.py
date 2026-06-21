"""
Request / response schemas for the TTS endpoint.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class TTSRequest(BaseModel):
    """
    Request body for ``POST /api/v1/tts/synthesize``.

    Attributes:
        question_id: Used to name the generated WAV file.
        text:        Text to convert to speech (max 500 chars).
        language:    BCP-47 language code (default ``"en"``).
        slow:        If ``True``, generate slower speech.
    """

    question_id: str = Field(..., min_length=1, description="Question identifier (used as filename).")
    text: str = Field(..., min_length=1, max_length=500, description="Text to synthesise.")
    language: str = Field(default="en", description="BCP-47 language code.")
    slow: bool = Field(default=False, description="Use slower speech rate.")
