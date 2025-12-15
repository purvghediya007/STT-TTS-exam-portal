# config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):

    HF_EVAL_MODEL_NAME: str = "microsoft/Phi-3.5-mini-instruct"
    STT_DEFAULT_MODEL: str = "whisper"
    MCQ_EVAL_MODEL_NAME: str = "sentence-transformers/all-MiniLM-L6-v2"

    class Config:
        env_file = ".env"
        extra = "ignore"   

settings = Settings()
