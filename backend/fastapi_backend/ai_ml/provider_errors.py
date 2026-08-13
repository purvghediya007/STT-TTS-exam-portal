"""Translate third-party failures into stable domain exceptions."""
from ai_ml.exceptions import AudioProcessingError, EngineError, LLMProviderConnectionError

def _status(exc):
    status = getattr(exc, "status_code", None)
    return status if status is not None else getattr(getattr(exc, "response", None), "status_code", None)

def translate_openai_error(exc, operation: str, *, audio: bool = False):
    status, name, message = _status(exc), exc.__class__.__name__.lower(), str(exc).strip() or "Unknown OpenAI error"
    if status in (401, 403) or "auth" in name or "authentication" in message.lower():
        text = f"OpenAI authentication failed during {operation}. Check OPENAI_API_KEY."
    elif status == 429 or "ratelimit" in name or "rate limit" in message.lower():
        text = f"OpenAI rate limit reached during {operation}. Retry after a short delay."
    elif status and 500 <= int(status) < 600:
        text = f"OpenAI service error during {operation}: {message}"
    else:
        text = f"OpenAI {operation} failed: {message}"
    return EngineError(text) if audio else LLMProviderConnectionError(text)

def translate_elevenlabs_error(exc, operation: str):
    status, name, message = _status(exc), exc.__class__.__name__.lower(), str(exc).strip() or "Unknown ElevenLabs error"
    if status in (401, 403) or "auth" in name or "authentication" in message.lower():
        text = f"ElevenLabs authentication failed during {operation}. Check ELEVENLABS_API_KEY."
    elif status == 429 or "ratelimit" in name or "rate limit" in message.lower():
        text = f"ElevenLabs rate limit reached during {operation}. Retry after a short delay."
    elif status and 500 <= int(status) < 600:
        text = f"ElevenLabs service error during {operation}: {message}"
    else:
        text = f"ElevenLabs {operation} failed: {message}"
    return AudioProcessingError(text)
