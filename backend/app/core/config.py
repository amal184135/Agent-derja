from pydantic_settings import BaseSettings, SettingsConfigDict
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    mongo_url: str = "mongodb://localhost:27017"
    mongo_db_name: str = "agent_ai"

    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # --- TTS settings ---
    TTS_MODEL_DIR: Path = BASE_DIR / "models_weights" / "xtts_v2"
    TTS_CONFIG_PATH: Path | None = None
    TTS_REFERENCE_WAV: Path | None = None
    TTS_DEFAULT_LANGUAGE: str = "ar"
    TTS_DEVICE: str = "auto"  # "auto" | "cuda" | "cpu"

    # --- STT settings ---
    STT_BASE_MODEL: str = "openai/whisper-small"
    STT_ADAPTER_PATH: str = "models_weights/whisper_lora"
    STT_DEFAULT_LANGUAGE: str = "arabic"

    # --- Diacritization settings ---
    DIACRITICS_DICT_PATH: Path = BASE_DIR / "models_weights" / "tun_diacritics_dict_v2.json"
    #XTTS_LEXICON_PATH: Path = BASE_DIR / "models_weights" / "xtts_v2" / "correction_lexicon_xtts.json"  # AJOUT

    # --- Diacritization settings (ByT5) ---
    BYT5_MODEL_DIR: Path = BASE_DIR / "models_weights" / "byt5_derja_model"
    BYT5_DEVICE: str = "auto"  # "auto" | "cuda" | "cpu"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

# derive paths that depend on TTS_MODEL_DIR after instantiation
if settings.TTS_CONFIG_PATH is None:
    settings.TTS_CONFIG_PATH = settings.TTS_MODEL_DIR / "config.json"
if settings.TTS_REFERENCE_WAV is None:
    settings.TTS_REFERENCE_WAV = settings.TTS_MODEL_DIR / "reference.wav"
