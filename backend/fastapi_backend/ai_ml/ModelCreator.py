from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
from langchain_huggingface import HuggingFacePipeline

import whisper

try:
    import torch
except Exception:
    torch = None

class HFModelCreation:
    def __init__(self):
        pass

    def hf_model_creator(self, model_name: str):
        try:
            tokenizer = AutoTokenizer.from_pretrained(
                model_name, trust_remote_code=True
            )

            model = AutoModelForCausalLM.from_pretrained(
                model_name,
                torch_dtype="auto",
                device_map="auto",
                trust_remote_code=True
            )

            tokenizer.pad_token = tokenizer.eos_token

            gen = pipeline(
                "text-generation",
                model=model,
                tokenizer=tokenizer,
                max_new_tokens=600,
                temperature=0.0,
                do_sample=False,
                eos_token_id=tokenizer.eos_token_id,
                pad_token_id=tokenizer.eos_token_id,
                return_full_text=False
            )

            return HuggingFacePipeline(pipeline=gen)

        except Exception as e:
            print("Error loading HF model:", e)
            return None


class SpeechModelGenerator:
    """
    Loads Whisper / HF Whisper models ONCE per process.
    Used when user does NOT preload models via FastAPI startup.
    """
    _whisper_model = None
    _hf_model = None

    @staticmethod
    def _get_default_device():
        """Return -1 (CPU) or 0 (GPU)."""
        try:
            if torch is not None and torch.cuda.is_available():
                return 0
        except Exception:
            pass
        return -1

    @classmethod
    def whisper_model_generator(cls):
        """Lazy-load Whisper Base model."""
        if cls._whisper_model is None:
            cls._whisper_model = whisper.load_model("base")
        return cls._whisper_model

    @classmethod
    def hf_model_generator(cls):
        """Lazy-load HuggingFace Whisper Large-V3 pipeline."""
        if cls._hf_model is None:
            device = cls._get_default_device()
            cls._hf_model = pipeline(
                task="automatic-speech-recognition",
                model="openai/whisper-large-v3",
                device=device
            )
        return cls._hf_model


