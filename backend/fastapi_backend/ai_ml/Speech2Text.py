"""
Module for conversion of speech audio fetched by FastAPI to text format in given language.

How to run:

from ai_ml.Speech2Text import STT

stt = STT(lang="en", model="whisper", audio_file_name=audio_file_path)
stt.transcribe()
print(stt.transcription_list)
"""

from __future__ import annotations

#  Imports 
import warnings
warnings.filterwarnings("ignore")

import whisper
from transformers import pipeline

from backend.fastapi_backend.ai_ml.AIExceptions import IllegalModelSelectionException

from backend.fastapi_backend.ai_ml.AudioPreprocessor import AudioPreprocessor

# torch is optional but useful for device detection
try:
    import torch
except Exception:
    torch = None


#  Model Generator 
class ModelGenerator:
    """
    Creates and caches models so that they are loaded only once per process.
    """
    _whisper_model = None
    _hf_model = None

    @staticmethod
    def _get_default_device() -> int:
        """
        Returns -1 for CPU, 0 for first GPU if torch is available.
        """
        try:
            if "torch" in globals() and torch is not None and torch.cuda.is_available():
                return 0
        except Exception:
            pass
        return -1

    @classmethod
    def whisper_model_generator(cls):
        """
        Load and cache OpenAI Whisper (local) model.
        """
        if cls._whisper_model is None:
            # can change "base" -> "small", "medium", etc.
            cls._whisper_model = whisper.load_model("base")
        return cls._whisper_model

    @classmethod
    def hf_model_generator(cls):
        """
        Load and cache HuggingFace ASR pipeline (Whisper large-v3).
        """
        if cls._hf_model is None:
            device = cls._get_default_device()
            cls._hf_model = pipeline(
                task="automatic-speech-recognition",
                model="openai/whisper-large-v3",
                device=device,   # -1 = CPU, 0 = first GPU
            )
        return cls._hf_model


#  STT main class 
class STT:
    def __init__(self, lang: str, model: str, audio_file_name: str):
        self.lang: str = lang.lower()
        self.model: str = model.lower()          # "whisper" or "hf"
        self.audio_file_name: str = audio_file_name
        self.transcription_list: list[str] = []
        self.new_student: bool = True

    #  Preprocess 
    def audio_preprocess(self) -> str:
        """
        Run audio preprocessing and return path to processed audio file.
        For now, AudioPreprocess simply returns the original path.
        """
        preprocessor = AudioPreprocessor()
        result = preprocessor.preprocess_file(self.audio_file_name)

        return result.metadata.processed_path

    #  Local Whisper 
    def whisper_transcribe(self) -> str:
        try:
            whisper_model = ModelGenerator.whisper_model_generator()
            audio_preprocessed_path = self.audio_preprocess()

            # whisper's python API expects a file path
            transcription_data = whisper_model.transcribe(
                audio_preprocessed_path,
                language=self.lang
            )

            if isinstance(transcription_data, dict) and "text" in transcription_data:
                return transcription_data["text"]

            print("Unexpected Whisper output:", transcription_data)
            return ""

        except Exception as e:
            print("Error while accessing whisper model. Please try changing model")
            print("Details:", e)
            return ""

    #  HF Whisper pipeline 
    def hf_transcribe(self) -> str:
        """
        Use HuggingFace pipeline for ASR. Handles dict, list, and generator outputs.
        """
        try:
            asr_pipeline = ModelGenerator.hf_model_generator()
            audio_preprocessed = self.audio_preprocess()

            result = asr_pipeline(audio_preprocessed)

            # Case 1: list of dicts -> [{'text': '...'}]
            if isinstance(result, list) and result and isinstance(result[0], dict):
                if "text" in result[0]:
                    return result[0]["text"]

            # Case 2: single dict -> {'text': '...'}
            if isinstance(result, dict) and "text" in result:
                return result["text"]

            # Case 3: generator or other iterable (rare, but safe)
            if hasattr(result, "__iter__") and not isinstance(result, (dict, list, str)):
                result_list = list(result)
                if result_list and isinstance(result_list[0], dict) and "text" in result_list[0]:
                    return result_list[0]["text"]

            print("Unexpected HF pipeline output:", result)
            return ""

        except Exception as e:
            print("Error while accessing Hugging Face model. Please try changing model")
            print("Details:", e)
            return ""

    #  Selector 
    def model_selector(self) -> str:
        """
        Choose which backend to use based on self.model.
        """
        match self.model:
            case "whisper":
                return self.whisper_transcribe()
            case "hf":
                return self.hf_transcribe()
            case _:
                raise IllegalModelSelectionException(
                    f"Model type {self.model!r} not found. Try a different model type."
                )

    #  Public API 
    def transcribe(self) -> None:
        """
        Run transcription with selected model and store in transcription_list.
        """
        try:
            transcription = self.model_selector()
            if transcription:
                self.transcription_list.append(transcription)
        except Exception as e:
            # You might want to log this instead of just printing
            print("Transcription error:", e)
