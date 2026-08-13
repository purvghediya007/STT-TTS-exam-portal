"""Provider selection kept in one small, configuration-driven module."""

from ai_ml.model_creator import (
    ElevenLabsClientLoader,
    GroqAudioClientLoader,
    GroqModelLoader,
    OpenAIModelLoader,
)
from ai_ml.tts import GroqTTSEngine, OpenAITTSEngine, TTSEngine
from app.config import settings


def get_llm_model():
    provider = settings.LLM_PROVIDER.strip().lower()
    if provider == "openai":
        return OpenAIModelLoader.get_model()
    if provider == "groq":
        return GroqModelLoader.get_model()
    raise ValueError(f"Unsupported LLM_PROVIDER '{settings.LLM_PROVIDER}'. Choose openai or groq.")


def get_stt_client():
    provider = settings.STT_PROVIDER.strip().lower()
    if provider == "elevenlabs":
        return ElevenLabsClientLoader.get_client()
    if provider == "groq":
        return GroqAudioClientLoader.get_client()
    raise ValueError(f"Unsupported STT_PROVIDER '{settings.STT_PROVIDER}'. Choose elevenlabs or groq.")


def get_tts_engine() -> TTSEngine:
    provider = settings.TTS_PROVIDER.strip().lower()
    if provider == "openai":
        return OpenAITTSEngine()
    if provider == "groq":
        return GroqTTSEngine()
    raise ValueError(f"Unsupported TTS_PROVIDER '{settings.TTS_PROVIDER}'. Choose openai or groq.")
