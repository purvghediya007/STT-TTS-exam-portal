"""Request / response schemas for the STT endpoint."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class STTResponse(BaseModel):
    """Response body for ``POST /api/v1/stt/transcribe``."""

    text: str = ""
    language: Optional[str] = "en"
    model: Optional[str] = "groq"
