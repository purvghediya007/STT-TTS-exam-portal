# config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):

    HF_EVAL_MODEL_NAME: str = "Qwen/Qwen2.5-3B-Instruct"
    STT_DEFAULT_MODEL: str = "whisper"

    class Config:
        env_file = ".env"
        extra = "ignore"   

settings = Settings()
