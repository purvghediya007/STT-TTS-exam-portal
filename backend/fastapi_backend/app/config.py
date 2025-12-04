# config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    HF_EVAL_MODEL_NAME: str = "Qwen/Qwen3-4B-Instruct-2507"
    STT_DEFAULT_MODEL: str = "whisper"

    class Config:
        env_file = ".env"

settings = Settings()
