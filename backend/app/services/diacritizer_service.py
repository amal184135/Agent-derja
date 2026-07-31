import json
import logging
import re
import threading
import unicodedata
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger("diacritizer")

ARABIC_DIACRITICS = set(
    chr(c) for c in range(0x0610, 0x061B)
) | set(chr(c) for c in range(0x064B, 0x0653)) | {"\u0670"}

PUNCT_CHARS = "\u060C\u061B\u061F.,!?;:\"'«»()[]{}"
_PUNCT_PATTERN = re.compile(rf"^([{re.escape(PUNCT_CHARS)}]*)(.*?)([{re.escape(PUNCT_CHARS)}]*)$")


def strip_diacritics(word: str) -> str:
    return "".join(ch for ch in unicodedata.normalize("NFC", word) if ch not in ARABIC_DIACRITICS)


class TunisianDiacritizer:
    """
    Corrige la diacritisation d'un texte en derja tunisienne (sortie Gemini,
    sans diacritiques) en s'appuyant sur le dictionnaire extrait de TunArTTS.
    Chargement paresseux + thread-safe, meme pattern que TTSEngine.
    """

    def __init__(self, dict_path: Path):
        self._dict_path = dict_path
        self._lock = threading.Lock()
        self._lookup: dict[str, str] | None = None

    def load(self) -> None:
        if self._lookup is not None:
            return
        with self._lock:
            if self._lookup is not None:
                return
            if not self._dict_path.exists():
                logger.warning(
                    "Dictionnaire de diacritisation introuvable (%s) -> correction desactivee.",
                    self._dict_path,
                )
                self._lookup = {}
                return
            with open(self._dict_path, encoding="utf-8") as f:
                word_dict = json.load(f)
            self._lookup = {strip_diacritics(k): v for k, v in word_dict.items()}
            logger.info("Dictionnaire de diacritisation charge: %d mots", len(self._lookup))

    @property
    def is_ready(self) -> bool:
        return self._lookup is not None

    def correct(self, text: str) -> str:
        """Remplace chaque mot connu par sa diacritisation tunisienne (TunArTTS).
        Les mots absents du dictionnaire sont laisses tels quels (non diacritises)."""
        if self._lookup is None:
            self.load()
        if not self._lookup:
            return text

        corrected_tokens = []
        for token in text.split():
            m = _PUNCT_PATTERN.match(token)
            leading, core, trailing = m.groups() if m else ("", token, "")
            if not core:
                corrected_tokens.append(token)
                continue
            raw_core = strip_diacritics(core)
            corrected = self._lookup.get(raw_core, core)
            corrected_tokens.append(f"{leading}{corrected}{trailing}")

        return " ".join(corrected_tokens)

    def coverage(self, text: str) -> float:
        """Utile pour du monitoring/logging: proportion de mots trouves dans le dictionnaire."""
        if self._lookup is None:
            self.load()
        tokens = [strip_diacritics(t.strip(PUNCT_CHARS)) for t in text.split()]
        tokens = [t for t in tokens if t]
        if not tokens:
            return 0.0
        found = sum(1 for t in tokens if t in self._lookup)
        return found / len(tokens)


diacritizer = TunisianDiacritizer(settings.DIACRITICS_DICT_PATH)