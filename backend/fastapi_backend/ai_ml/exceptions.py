"""
Custom exception hierarchy for ExamEcho AI/ML services.

All domain exceptions are defined here to avoid circular imports
and provide a single source of truth for error handling.
"""


class ExamEchoAIError(Exception):
    """Base exception for all ExamEcho AI errors."""



# STT / Audio

class AudioProcessingError(ExamEchoAIError):
    """Raised when audio file loading, conversion, or VAD processing fails."""


class IllegalModelSelectionError(ExamEchoAIError):
    """Raised when an unsupported STT model name is requested."""



# TTS

class TTSError(ExamEchoAIError):
    """Base exception for Text-to-Speech failures."""


class TextSourceError(TTSError):
    """Raised when the text input (file or direct) is invalid or empty."""


class EngineError(TTSError):
    """Raised when the TTS engine (e.g. gTTS) fails to synthesize audio."""



# LLM / Generation

class ChainCreationError(ExamEchoAIError):
    """Raised when a LangChain prompt+model chain cannot be constructed."""


class QuestionsGenerationError(ExamEchoAIError):
    """Raised when question generation fails or returns unexpected output."""


class EvaluationError(ExamEchoAIError):
    """Raised when the LLM evaluation pipeline fails."""


class RubricsGenerationError(ExamEchoAIError):
    """Raised when rubric generation fails or returns unexpected output."""



# Model / Server Loading

class ModelLoadError(ExamEchoAIError):
    """Raised when a model (Whisper, Groq, SentenceTransformer) fails to load."""


class GroqConnectionError(ExamEchoAIError):
    """Raised when the Groq API is unreachable or the API key is invalid."""
