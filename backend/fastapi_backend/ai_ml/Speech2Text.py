"""
Module for conversion of speech audio fetched by FastAPI to text format in given language.

USAGE :
--------------------------------
from ai_ml.Speech2Text import STT
stt = STT(lang="en", model="whisper", audio_file_name=audio_file_path)
stt.transcribe()
print(stt.transcription_list)

USAGE (recommended with preloaded Whisper model):
-------------------------------------------------
from app.main import whisper_model
from ai_ml.Speech2Text import STT

stt = STT(lang="en", model="whisper", audio_file_name=audio_file_path)
text = stt.transcribe_with_existing_model(whisper_model, audio_file_path)
"""

from __future__ import annotations
import warnings
warnings.filterwarnings("ignore")

# Imports

from transformers import pipeline

from ai_ml.AIExceptions import IllegalModelSelectionException
from ai_ml.AudioPreprocessor import AudioPreprocessor
from ai_ml.ModelCreator import SpeechModelGenerator

#   STT MAIN CLASS
class STT:
    def __init__(self, lang: str, model: str, audio_file_name: str):
        """
        model = "whisper" OR "hf"
        """
        self.lang = lang.lower()
        self.model = model.lower()
        self.audio_file_name = audio_file_name
        self.transcription_list: list[str] = []
        self.new_student: bool = True

     
    #   PREPROCESS     
    def audio_preprocess(self) -> str:
        """
        Run audio preprocessing and return processed file path.
        """
        preprocessor = AudioPreprocessor()
        result = preprocessor.preprocess_file(self.audio_file_name)
        return result.metadata.processed_path

     
    #   LOCAL WHISPER TRANSCRIBE     
    def whisper_transcribe(self) -> str:
        """
        Uses ModelGenerator → loads Whisper only on first call.
        (Backward compatible method)
        """
        try:
            whisper_model = SpeechModelGenerator.whisper_model_generator()
            audio_path = self.audio_preprocess()

            output = whisper_model.transcribe(audio_path, language=self.lang)
            if isinstance(output, dict) and "text" in output:
                return output["text"]

            print("Unexpected Whisper output:", output)
            return ""
        except Exception as e:
            print("Error while accessing Whisper model:", e)
            return ""

     
    #   HF WHISPER PIPELINE     
    def hf_transcribe(self) -> str:
        try:
            pipeline_model = SpeechModelGenerator.hf_model_generator()
            audio_path = self.audio_preprocess()

            result = pipeline_model(audio_path)

            # Handle: [{"text": "..."}]
            if isinstance(result, list) and result and isinstance(result[0], dict):
                return result[0].get("text", "")

            # Handle: {"text": "..."}
            if isinstance(result, dict):
                return result.get("text", "")

            # Handle generators
            if hasattr(result, "__iter__") and not isinstance(result, (dict, list, str)):
                items = list(result)
                if items and isinstance(items[0], dict):
                    return items[0].get("text", "")

            print("Unexpected HF pipeline output:", result)
            return ""

        except Exception as e:
            print("Error while accessing HF Whisper:", e)
            return ""

     
    #   SELECTOR     
    def model_selector(self) -> str:
        match self.model:
            case "whisper":
                return self.whisper_transcribe()
            case "hf":
                return self.hf_transcribe()
            case _:
                raise IllegalModelSelectionException(
                    f"Model type {self.model} is invalid. Choose 'whisper' or 'hf'."
                )

     
    #   PUBLIC API     
    def transcribe(self):
        """
        BACKWARD COMPATIBLE.
        Loads Whisper at first use.
        """
        try:
            text = self.model_selector()
            if text:
                self.transcription_list.append(text)
        except Exception as e:
            print("Transcription error:", e)

     
    #   TRANSCRIBE WITH PRE-LOADED MODEL
    def transcribe_with_existing_model(self, whisper_model, audio_file_path, lang=None):
        """
        Uses a preloaded whisper model (from FastAPI startup)
        → NO reloading
        → FAST response
        """
        try:
            lang = lang or self.lang

            output = whisper_model.transcribe(audio_file_path, language=lang)

            if isinstance(output, dict) and "text" in output:
                return output["text"]

            print("Unexpected Whisper output:", output)
            return ""
        except Exception as e:
            print("Whisper transcription failed:", e)
            return ""
