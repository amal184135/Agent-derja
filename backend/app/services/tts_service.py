import io
import threading

import soundfile as sf
import torch
from TTS.tts.configs.xtts_config import XttsConfig
from app.core.config import settings
from TTS.tts.models.xtts import Xtts



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
            xtts_config.load_json(str(settings.TTS_CONFIG_PATH))

            model = Xtts.init_from_config(xtts_config)
            model.load_checkpoint(xtts_config, checkpoint_dir=str(settings.TTS_MODEL_DIR), eval=True)

            device = settings.TTS_DEVICE
            if device == "auto":
                device = "cuda" if torch.cuda.is_available() else "cpu"
            model.to(device)

            self._model = model
            self._config = xtts_config
            self._device = device

            # Calcule le conditioning du locuteur UNE SEULE FOIS ici,
            # au lieu de le refaire a chaque appel de synthesize().
            self._gpt_cond_latent, self._speaker_embedding = model.get_conditioning_latents(
                audio_path=[str(settings.TTS_REFERENCE_WAV)],
                gpt_cond_len=xtts_config.gpt_cond_len,
                gpt_cond_chunk_len=xtts_config.gpt_cond_chunk_len,
            )

    @property
    def device(self) -> str:
        return self._device or "not-loaded"

    @property
    def is_ready(self) -> bool:
        return self._model is not None

    def synthesize(self, text: str, language: str) -> bytes:
        if self._model is None:
            raise RuntimeError("Le modele TTS n'est pas encore charge")

        outputs = self._model.inference(
            text,
            language,
            self._gpt_cond_latent,
            self._speaker_embedding,
        )

        wav = outputs["wav"]
        sample_rate = self._config.audio["output_sample_rate"]

        buffer = io.BytesIO()
        sf.write(buffer, wav, sample_rate, format="WAV")
        buffer.seek(0)
        return buffer.read()


engine = TTSEngine()
