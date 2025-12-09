# config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):

    HF_EVAL_MODEL_NAME: str = "mistralai/Mistral-Nemo-Instruct-2407"
    STT_DEFAULT_MODEL: str = "whisper"

    class Config:
        env_file = ".env"
        extra = "ignore"   

settings = Settings()
