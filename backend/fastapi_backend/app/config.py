# config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):

    HF_EVAL_MODEL_NAME: str = "NousResearch/Hermes-2-Pro-Mistral-7B"
    STT_DEFAULT_MODEL: str = "whisper"

    class Config:
        env_file = ".env"
        extra = "ignore"   

settings = Settings()
