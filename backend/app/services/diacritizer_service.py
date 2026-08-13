import json
import logging
import re
import threading
import unicodedata
from pathlib import Path

import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

from app.core.config import settings

logger = logging.getLogger("diacritizer")

ARABIC_DIACRITICS = set(
    chr(c) for c in range(0x0610, 0x061B)
) | set(chr(c) for c in range(0x064B, 0x0653)) | {"\u0670"}

PUNCT_CHARS = "\u060C\u061B\u061F.,!?;:\"'«»()[]{}"
_PUNCT_PATTERN = re.compile(rf"^([{re.escape(PUNCT_CHARS)}]*)(.*?)([{re.escape(PUNCT_CHARS)}]*)$")

_ARABIC_CHAR_RE = re.compile(r"[\u0600-\u06FF]")

SUKUN = "\u0652"
VERB_PREFIXES = ("ن", "ت", "ي")

PREFIX_2 = {"تت": "تِتْ", "يت": "يِتْ", "نت": "نِتْ", "بال": "بِالْ", "لل": "لِلْ"}
PREFIX_1 = {"و": "وْ", "ف": "فْ", "ب": "بِ", "ل": "لْ", "ك": "كِ"}

SUFFIXES = {
    "لها": "لْهَا", "لهم": "لْهُمْ", "لكم": "لْكُمْ",
    "ها": "هَا", "هم": "هُمْ", "كم": "كُمْ", "نا": "نَا",
    "لي": "لِي", "لك": "لِكْ", "لو": "لُو",
    "ي": "ِي", "و": "ُو", "ه": "هْ", "ك": "كْ",
}
_SUFFIXES_ORDERED = sorted(SUFFIXES, key=len, reverse=True)

TASK_PREFIX = "diacritize derja: "


def strip_diacritics(word: str) -> str:
    return "".join(ch for ch in unicodedata.normalize("NFC", word) if ch not in ARABIC_DIACRITICS)


def apply_phonetic_rules(word: str) -> str:
    """Regles morphologiques ciblees, dernier recours si ni le dictionnaire ni le
    modele ByT5 n'ont pu diacritiser correctement le mot. Idempotente."""
    if word.startswith("ما") and word.endswith("ش") and len(word) > 3 and not word.endswith("شْ"):
        word = word[:-1] + "ش" + SUKUN

    if (
        len(word) > 3
        and word[0] in VERB_PREFIXES
        and word[1] != SUKUN
        and word[1] not in ("ا", "و", "ي")
    ):
        word = word[0] + SUKUN + word[1:]

    return word


class TunisianDiacritizer:
    """
    Corrige la prononciation d'un texte en derja tunisien via une cascade a plusieurs
    niveaux, du plus fiable au moins fiable :
      0. Expressions figees multi-mots (dictionnaire) -- avant le decoupage mot-par-mot
      1. Dictionnaire manuel valide (mot unique) -- fiabilite ~100% sur les mots couverts
      2. Prefixe/suffixe clitique colle + mot connu du dictionnaire
      3. Modele ByT5 fine-tune -- pour les mots hors dictionnaire (OOV), avec verification
         que le squelette consonantique de la prediction correspond au mot d'origine
         (rejette les hallucinations du modele plutot que d'accepter un mot corrompu)
      4. Regles phonetiques morphologiques -- dernier recours si le modele a ete rejete
      5. Si rien ne s'applique : le mot est laisse tel quel (non diacritise)
 
    Chargement paresseux + thread-safe.
    """
 
    def __init__(self, dict_path: Path, byt5_model_dir: Path, byt5_device: str = "auto", num_beams: int = 1):
        self._dict_path = dict_path
        self._byt5_model_dir = byt5_model_dir
        self._byt5_device = byt5_device
        self._num_beams = num_beams
 
        self._lock = threading.Lock()
        self._lookup: dict[str, str] | None = None
        self._phrase_lookup: dict[str, str] = {}
        self._max_phrase_words = 1
 
        self._model = None
        self._tokenizer = None
 
        # Cache des resultats ByT5 deja calcules pour des mots OOV -- beaucoup de
        # mots hors-dictionnaire reviennent d'une conversation a l'autre (noms propres,
        # emprunts frequents...). Evite de refaire une inference GPU pour un mot deja vu.
        self._byt5_cache: dict[str, str | None] = {}
 
    def load(self) -> None:
        if self._lookup is not None:
            return
        with self._lock:
            if self._lookup is not None:
                return
 
            # --- Dictionnaire ---
            if not self._dict_path.exists():
                logger.warning(
                    "Dictionnaire de diacritisation introuvable (%s) -> seuls le modele et les regles s'appliqueront.",
                    self._dict_path,
                )
                self._lookup = {}
            else:
                with open(self._dict_path, encoding="utf-8") as f:
                    word_dict = json.load(f)
 
                self._lookup = {}
                self._phrase_lookup = {}
                for k, v in word_dict.items():
                    if " " in k:
                        raw_key = " ".join(strip_diacritics(w) for w in k.split())
                        self._phrase_lookup[raw_key] = v
                        self._max_phrase_words = max(self._max_phrase_words, len(k.split()))
                    else:
                        self._lookup[strip_diacritics(k)] = v
 
                logger.info(
                    "Dictionnaire de diacritisation charge: %d mots, %d expressions figees",
                    len(self._lookup), len(self._phrase_lookup),
                )
 
            # --- Modele ByT5 (fallback OOV) ---
            device = self._byt5_device
            if device == "auto":
                device = "cuda" if torch.cuda.is_available() else "cpu"
 
            logger.info("Chargement du modele de diacritisation ByT5 depuis %s (device=%s)", self._byt5_model_dir, device)
            self._tokenizer = AutoTokenizer.from_pretrained(str(self._byt5_model_dir))
            self._model = AutoModelForSeq2SeqLM.from_pretrained(str(self._byt5_model_dir))
            self._model.to(device)
            # fp16 en INFERENCE PURE est sur pour T5/ByT5 (contrairement a l'entrainement,
            # ou le backprop en fp16 causait une divergence numerique) -- gain de vitesse
            # notable sur GPU, sans risque ici puisqu'il n'y a pas de gradient calcule.
            if device == "cuda":
                self._model = self._model.half()
            self._model.eval()
            self._byt5_device = device
            logger.info("Modele de diacritisation ByT5 charge avec succes")
 
    @property
    def is_ready(self) -> bool:
        return self._lookup is not None and self._model is not None
 
    def _try_prefix_split(self, bare_word: str) -> str | None:
        for prefix, prefix_diac in PREFIX_2.items():
            if bare_word.startswith(prefix) and len(bare_word) > len(prefix) + 1:
                remainder = bare_word[len(prefix):]
                if remainder in self._lookup:
                    return prefix_diac + self._lookup[remainder]
        for prefix, prefix_diac in PREFIX_1.items():
            if bare_word.startswith(prefix) and len(bare_word) > len(prefix) + 1:
                remainder = bare_word[len(prefix):]
                if remainder in self._lookup:
                    return prefix_diac + self._lookup[remainder]
        return None
 
    def _try_suffix_split(self, bare_word: str) -> str | None:
        for suffix in _SUFFIXES_ORDERED:
            if not (bare_word.endswith(suffix) and len(bare_word) > len(suffix) + 1):
                continue
            remainder = bare_word[: -len(suffix)]
            if remainder in self._lookup:
                return self._lookup[remainder] + SUFFIXES[suffix]
            if remainder.endswith("ت"):
                alt = remainder[:-1] + "ة"
                if alt in self._lookup:
                    return self._lookup[alt][:-1] + "ت" + SUFFIXES[suffix]
        return None
 
    def _byt5_diacritize_batch(self, words: list[str]) -> dict[str, str | None]:
        """Diacritise une liste de mots avec le modele ByT5, en un seul batch.
        Retourne None pour les mots ou la prediction a ete rejetee (squelette
        consonantique different de l'original -> hallucination probable).
 
        Verifie d'abord le cache -- seuls les mots vraiment nouveaux (jamais vus
        depuis le demarrage du serveur) declenchent une inference GPU."""
        if not words:
            return {}
 
        results: dict[str, str | None] = {}
        to_generate = []
        for w in words:
            if w in self._byt5_cache:
                results[w] = self._byt5_cache[w]
            else:
                to_generate.append(w)
 
        if not to_generate:
            return results
 
        inputs = self._tokenizer(
            [TASK_PREFIX + w for w in to_generate],
            return_tensors="pt", padding=True, truncation=True, max_length=32,
        ).to(self._byt5_device)
 
        with torch.inference_mode():
            outputs = self._model.generate(
                **inputs,
                max_length=48,  # aligne sur MAX_TARGET_LEN utilise a l'entrainement --
                                 # une valeur plus basse tronquerait les mots/expressions
                                 # diacritisees les plus longues du dictionnaire
                num_beams=self._num_beams,
            )
 
        raw_predictions = self._tokenizer.batch_decode(outputs, skip_special_tokens=True)
 
        for original, predicted in zip(to_generate, raw_predictions):
            if strip_diacritics(predicted) == original:
                results[original] = predicted
                self._byt5_cache[original] = predicted
            else:
                logger.info(
                    "[diacritizer][byt5][rejete] %r -> %r (squelette different)",
                    original, predicted,
                )
                results[original] = None
                self._byt5_cache[original] = None
        return results
 
    def correct(self, text: str) -> str:
        if self._lookup is None:
            self.load()
 
        parsed = []
        for token in text.split():
            m = _PUNCT_PATTERN.match(token)
            leading, core, trailing = m.groups() if m else ("", token, "")
            parsed.append((leading, core, trailing, strip_diacritics(core) if core else ""))
 
        n = len(parsed)
        # Pre-alloue une case par position dans `parsed` -- indispensable pour que
        # les indices restent alignes avec `parsed` meme quand une expression
        # multi-mots "consomme" plusieurs positions d'un coup (span > 1).
        result_tokens: list[str | None] = [None] * n
        pending_byt5: dict[int, str] = {}  # index dans parsed/result_tokens -> raw_core
        i = 0
        while i < n:
            leading, core, trailing, raw_core = parsed[i]
            if not core:
                result_tokens[i] = leading + trailing
                i += 1
                continue
 
            # --- Niveau 0 : expressions figees multi-mots ---
            matched_phrase = False
            max_span = min(self._max_phrase_words, n - i)
            for span in range(max_span, 1, -1):
                candidate_raw = " ".join(parsed[j][3] for j in range(i, i + span))
                if candidate_raw in self._phrase_lookup:
                    phrase_leading = parsed[i][0]
                    phrase_trailing = parsed[i + span - 1][2]
                    result_tokens[i] = f"{phrase_leading}{self._phrase_lookup[candidate_raw]}{phrase_trailing}"
                    # Les positions suivantes de la phrase sont deja "consommees" ;
                    # on les marque vides (pas None) pour qu'elles soient ignorees
                    # au join final sans jamais rester en attente du modele ByT5.
                    for j in range(i + 1, i + span):
                        result_tokens[j] = ""
                    logger.info("[diacritizer][expression] %r -> %r", candidate_raw, self._phrase_lookup[candidate_raw])
                    i += span
                    matched_phrase = True
                    break
            if matched_phrase:
                continue
 
            # --- Niveau 1 : dictionnaire mot unique ---
            if raw_core in self._lookup:
                result_tokens[i] = f"{leading}{self._lookup[raw_core]}{trailing}"
                i += 1
                continue
 
            # --- Niveau 2 : prefixe/suffixe clitique ---
            prefix_result = self._try_prefix_split(raw_core)
            if prefix_result is not None:
                logger.info("[diacritizer][prefixe] %r -> %r", core, prefix_result)
                result_tokens[i] = f"{leading}{prefix_result}{trailing}"
                i += 1
                continue
 
            suffix_result = self._try_suffix_split(raw_core)
            if suffix_result is not None:
                logger.info("[diacritizer][suffixe] %r -> %r", core, suffix_result)
                result_tokens[i] = f"{leading}{suffix_result}{trailing}"
                i += 1
                continue
 
            # --- Pas trouve dans le dictionnaire : candidat pour le modele ByT5 ---
            if _ARABIC_CHAR_RE.search(raw_core):
                pending_byt5[i] = raw_core
            # result_tokens[i] reste None -- resolu apres le batch ByT5 ci-dessous
            i += 1
 
        # --- Niveau 3 : modele ByT5 en batch pour tous les mots OOV collectes ---
        if pending_byt5:
            byt5_results = self._byt5_diacritize_batch(list(pending_byt5.values()))
            for idx, raw_core in pending_byt5.items():
                leading, core, trailing, _ = parsed[idx]
                predicted = byt5_results.get(raw_core)
                if predicted is not None:
                    result_tokens[idx] = f"{leading}{predicted}{trailing}"
                else:
                    # --- Niveau 4 : regles phonetiques (dernier recours) ---
                    corrected = apply_phonetic_rules(core)
                    if corrected != core:
                        logger.info("[diacritizer][regle phonetique] %r -> %r", core, corrected)
                    result_tokens[idx] = f"{leading}{corrected}{trailing}"
 
        # Placeholders restants (mots sans caracteres arabes, ex. chiffres/latin) : inchanges
        for idx in range(n):
            if result_tokens[idx] is None:
                leading, core, trailing, _ = parsed[idx]
                result_tokens[idx] = f"{leading}{core}{trailing}"
 
        return " ".join(t for t in result_tokens if t != "")
 
    def coverage(self, text: str) -> float:
        """Proportion de mots trouves directement dans le dictionnaire manuel (mots seuls)."""
        if self._lookup is None:
            self.load()
        tokens = [strip_diacritics(t.strip(PUNCT_CHARS)) for t in text.split()]
        tokens = [t for t in tokens if t]
        if not tokens:
            return 0.0
        found = sum(1 for t in tokens if t in self._lookup)
        return found / len(tokens)
 
 
diacritizer = TunisianDiacritizer(
    settings.DIACRITICS_DICT_PATH,
    settings.BYT5_MODEL_DIR,
    byt5_device=settings.BYT5_DEVICE,
)