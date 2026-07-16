import io
import threading

import soundfile as sf
import torch
from TTS.tts.configs.xtts_config import XttsConfig
from TTS.tts.models.xtts import Xtts

from app.core import config


class TTSEngine:
    """Charge le checkpoint XTTS fine-tune une seule fois et sert les inferences."""

    def __init__(self):
        self._lock = threading.Lock()
        self._model = None
        self._config = None
        self._device = None

    def load(self):
        if self._model is not None:
            return

        with self._lock:
            if self._model is not None:
                return

            xtts_config = XttsConfig()
            xtts_config.load_json(str(config.TTS_CONFIG_PATH))

            model = Xtts.init_from_config(xtts_config)
            model.load_checkpoint(xtts_config, checkpoint_dir=str(config.TTS_MODEL_DIR), eval=True)

            device = config.TTS_DEVICE
            if device == "auto":
                device = "cuda" if torch.cuda.is_available() else "cpu"
            model.to(device)

            self._model = model
            self._config = xtts_config
            self._device = device

    @property
    def device(self) -> str:
        return self._device or "not-loaded"

    @property
    def is_ready(self) -> bool:
        return self._model is not None

    def synthesize(self, text: str, language: str) -> bytes:
        if self._model is None:
            raise RuntimeError("Le modele TTS n'est pas encore charge")

        outputs = self._model.synthesize(
            text,
            self._config,
            speaker_wav=str(config.TTS_REFERENCE_WAV),
            language=language,
            gpt_cond_len=self._config.gpt_cond_len,
            gpt_cond_chunk_len=self._config.gpt_cond_chunk_len,
        )

        wav = outputs["wav"]
        sample_rate = self._config.audio["output_sample_rate"]

        buffer = io.BytesIO()
        sf.write(buffer, wav, sample_rate, format="WAV")
        buffer.seek(0)
        return buffer.read()


engine = TTSEngine()