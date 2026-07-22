import os
import time
from threading import Lock

from google import genai
from google.genai import types

from app.clients.prompts import SYSTEM_PROMPT

GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.1-flash-lite")
SESSION_TTL_SECONDS = 60 * 60  # 1h d'inactivite avant de liberer une session

_client: genai.Client | None = None
_chats: dict[str, dict] = {}
_lock = Lock()


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY manquante. Mets-la dans le fichier .env (voir .env.example)."
            )
        _client = genai.Client(api_key=api_key)
    return _client


def _new_chat():
    client = _get_client()
    return client.chats.create(
        model=GEMINI_MODEL,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.9,
        ),
    )


def _cleanup_expired():
    now = time.time()
    expired = [
        sid for sid, entry in _chats.items()
        if now - entry["last_used"] > SESSION_TTL_SECONDS
    ]
    for sid in expired:
        del _chats[sid]


def get_or_create_chat(session_id: str):
    with _lock:
        _cleanup_expired()
        entry = _chats.get(session_id)
        if entry is None:
            entry = {"chat": _new_chat(), "last_used": time.time()}
            _chats[session_id] = entry
        entry["last_used"] = time.time()
        return entry["chat"]


def reset_chat(session_id: str) -> None:
    with _lock:
        _chats.pop(session_id, None)


def send_message(session_id: str, message: str) -> str:
    chat = get_or_create_chat(session_id)
    response = chat.send_message(message)
    return response.text


def send_message_stream(session_id: str, message: str):
    """
    Meme chat/historique/system_instruction que send_message, mais renvoie
    le texte au fur et a mesure qu'il est genere par Gemini (generateur).
    """
    chat = get_or_create_chat(session_id)
    for chunk in chat.send_message_stream(message):
        if chunk.text:
            yield chunk.text