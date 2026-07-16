from pydantic_settings import BaseSettings, SettingsConfigDict
import os
from pathlib import Path


class Settings(BaseSettings):
    mongo_url: str = "mongodb://localhost:27017"
    mongo_db_name: str = "agent_ai"

    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

# --- TTS settings ---
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # racine du backend (app/core/config.py -> backend/)

TTS_MODEL_DIR = Path(os.getenv("TTS_MODEL_DIR", str(BASE_DIR / "models_weights" / "xtts_v2")))
TTS_CONFIG_PATH = TTS_MODEL_DIR / "config.json"
TTS_REFERENCE_WAV = Path(os.getenv("TTS_REFERENCE_WAV", str(TTS_MODEL_DIR / "reference.wav")))
TTS_DEFAULT_LANGUAGE = os.getenv("TTS_DEFAULT_LANGUAGE", "ar")
TTS_DEVICE = os.getenv("TTS_DEVICE", "auto")  # "auto" | "cuda" | "cpu"
