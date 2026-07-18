import subprocess
from pathlib import Path

import numpy as np
import torch
from peft import PeftModel
from transformers import WhisperForConditionalGeneration, WhisperProcessor

from app.core.config import settings

SAMPLE_RATE = 16000


class STTEngine:
    def __init__(self):
        self.processor = None
        self.model = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

    def load(self):
        self.processor = WhisperProcessor.from_pretrained(settings.STT_ADAPTER_PATH)
        base_model = WhisperForConditionalGeneration.from_pretrained(settings.STT_BASE_MODEL)
        self.model = PeftModel.from_pretrained(base_model, settings.STT_ADAPTER_PATH)
        self.model.to(self.device)
        self.model.eval()

    def is_loaded(self) -> bool:
        return self.model is not None

    @staticmethod
    def decode_audio(audio_bytes: bytes, sample_rate: int = SAMPLE_RATE) -> np.ndarray:
        process = subprocess.run(
            [
                "ffmpeg", "-hide_banner", "-loglevel", "error",
                "-i", "pipe:0",
                "-f", "f32le", "-ac", "1", "-ar", str(sample_rate),
                "pipe:1",
            ],
            input=audio_bytes,
            capture_output=True,
        )
        if process.returncode != 0:
            raise ValueError(process.stderr.decode(errors="ignore").strip())
        return np.frombuffer(process.stdout, dtype=np.float32)

    def transcribe(self, audio_bytes: bytes, language: str | None = None) -> str:
        if not self.is_loaded():
            raise RuntimeError("Le modèle STT n'est pas chargé")

        language = language or settings.STT_DEFAULT_LANGUAGE
        audio = self.decode_audio(audio_bytes)

        inputs = self.processor(audio, sampling_rate=SAMPLE_RATE, return_tensors="pt")
        input_features = inputs.input_features.to(self.device)

        forced_decoder_ids = self.processor.get_decoder_prompt_ids(language=language, task="transcribe")

        with torch.no_grad():
            predicted_ids = self.model.generate(input_features, forced_decoder_ids=forced_decoder_ids)

        text = self.processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
        return text.strip()


engine = STTEngine()