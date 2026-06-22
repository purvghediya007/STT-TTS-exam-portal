"""Singleton model loaders for Groq LLM and Groq audio clients."""

from __future__ import annotations

import logging

from langchain_groq import ChatGroq

from app.config import settings
from ai_ml.exceptions import GroqConnectionError, ModelLoadError

logger = logging.getLogger(__name__)


try:
    import torch as _torch
    _TORCH_AVAILABLE = True
except ImportError:
    _torch = None  # type: ignore[assignment]
    _TORCH_AVAILABLE = False


def _default_device() -> str:
    """Return ``cuda`` if a GPU is available, otherwise ``cpu``."""
    if _TORCH_AVAILABLE and _torch.cuda.is_available():
        return "cuda"
    return "cpu"


class WhisperModelLoader:
    """Lazy singleton loader for local Whisper.

    This loader is retained for backward compatibility only. The runtime no
    longer depends on it for STT.
    """

    _instance = None

    @classmethod
    def get_model(cls):
        """Return the cached Whisper model, loading it if necessary."""
        if cls._instance is None:
            try:
                import whisper  # noqa: PLC0415

                size = "base"
                device = _default_device()
                logger.info("Loading Whisper '%s' model on %s ...", size, device)
                cls._instance = whisper.load_model(size, device=device)
                logger.info("Whisper model loaded successfully.")
            except Exception as exc:
                raise ModelLoadError(f"Failed to load Whisper model: {exc}") from exc
        return cls._instance


class GroqAudioClientLoader:
    """Lazy singleton loader for the Groq Python SDK client."""

    _instance = None

    @classmethod
    def get_client(cls):
        """
        Return the cached Groq SDK client, creating it if necessary.

        Raises:
            GroqConnectionError: If GROQ_API_KEY is missing.
            ModelLoadError: If the client cannot be initialised.
        """
        if cls._instance is None:
            try:
                api_key = settings.require_groq_api_key()
            except ValueError as exc:
                raise GroqConnectionError(str(exc)) from exc

            logger.info("Connecting Groq audio client")

            try:
                from groq import Groq  # noqa: PLC0415

                cls._instance = Groq(api_key=api_key)

                logger.info("Groq audio client initialised successfully.")
            except Exception as exc:
                raise ModelLoadError(f"Failed to initialise Groq audio client: {exc}") from exc
        return cls._instance

    @classmethod
    def reset(cls) -> None:
        """Clear the cached Groq audio client."""
        cls._instance = None


class GroqModelLoader:
    """Lazy singleton loader for Groq via LangChain."""

    _instance: ChatGroq | None = None

    @classmethod
    def get_model(cls) -> ChatGroq:
        """Return the cached Groq model wrapper, creating it if necessary."""
        if cls._instance is None:
            try:
                api_key = settings.require_groq_api_key()
            except ValueError as exc:
                raise GroqConnectionError(str(exc)) from exc

            logger.info("Connecting to Groq with model '%s' ...", settings.GROQ_MODEL_NAME)

            try:
                cls._instance = ChatGroq(
                    api_key=api_key,
                    model=settings.GROQ_MODEL_NAME,
                    temperature=settings.GROQ_TEMPERATURE,
                    max_tokens=settings.GROQ_MAX_TOKENS,
                )
                logger.info("Groq model '%s' initialised successfully.", settings.GROQ_MODEL_NAME)
            except Exception as exc:
                raise ModelLoadError(
                    f"Failed to initialise Groq model '{settings.GROQ_MODEL_NAME}': {exc}"
                ) from exc
        return cls._instance

    @classmethod
    def reset(cls) -> None:
        """Clear the cached instance."""
        cls._instance = None
