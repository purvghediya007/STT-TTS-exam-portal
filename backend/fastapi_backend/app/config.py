"""Application configuration loaded from environment variables / .env file."""

from __future__ import annotations

from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Groq (cloud LLM + audio)
    GROQ_API_KEY: str = ""
    GROQ_API_BASE_URL: str = "https://api.groq.com"
    GROQ_MODEL_NAME: str = "llama-3.3-70b-versatile"
    GROQ_TEMPERATURE: float = 0.0
    GROQ_MAX_TOKENS: int = 2048
    GROQ_STT_MODEL_NAME: str = "whisper-large-v3"
    GROQ_TTS_MODEL_NAME: str = "playai-tts"
    GROQ_TTS_VOICE: str = "autumn"
    GROQ_TTS_RESPONSE_FORMAT: str = "wav"
    STT_DEFAULT_MODEL: str = "groq"
    WHISPER_MODEL_SIZE: str = "base"  # Deprecated compatibility field

    # MCQ Evaluation
    MCQ_EVAL_MODEL_NAME: str = "sentence-transformers/all-MiniLM-L6-v2"
    MCQ_SIMILARITY_THRESHOLD: float = 0.75

    # TTS
    TTS_AUDIO_DIR: str = "generated_audio"

    # CORS
    CORS_ORIGINS: List[str] = ["*"]

    # API
    API_V1_PREFIX: str = "/api/v1"
    APP_TITLE: str = "ExamEcho AI Service"
    APP_VERSION: str = "3.0.0"
    APP_DESCRIPTION: str = (
        "AI microservice powering ExamEcho: STT, TTS, "
        "question generation, rubric creation, and answer evaluation. "
        "Uses Groq (llama-3.3-70b-versatile) for all LLM tasks - fast cloud inference."
    )

    class Config:
        env_file = ".env"
        extra = "ignore"

    def require_groq_api_key(self) -> str:
        """Return a validated Groq API key or raise a helpful error."""
        api_key = (self.GROQ_API_KEY or "").strip()
        if not api_key:
            raise ValueError(
                "GROQ_API_KEY is not set. Add it to your .env file as GROQ_API_KEY=gsk_..."
            )
        return api_key


settings = Settings()
