import asyncio
import logging
import re
import threading
import uuid
import time
from urllib.parse import quote
from jose import JWTError, jwt

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import Response

from app.services.stt_service import engine as stt_engine
from app.services.tts_service import engine as tts_engine
from app.core.config import settings
from app.services import chat_service, conversation_service

logger = logging.getLogger("voice_pipeline")

router = APIRouter(prefix="/voice", tags=["voice"])

# app/models/tts.py -> TTSRequest.language attend un code court ("ar"),
# alors que stt_service utilise des noms de langue ("arabic"). On mappe l'un vers l'autre.
STT_TO_TTS_LANGUAGE = {
    "arabic": "ar",
    "ar": "ar",
    "french": "fr",
    "fr": "fr",
    "english": "en",
    "en": "en",
}

SENTENCE_END_RE = re.compile(r"[.!?؟:]+")

MAX_TTS_CHARS = 160  # marge de securite sous la limite XTTS de 166 caracteres (arabe)


def _split_into_sentences(text_chunks):
    buffer = ""
    for chunk in text_chunks:
        buffer += chunk
        while True:
            match = SENTENCE_END_RE.search(buffer)
            if not match:
                break
            end = match.end()
            sentence = buffer[:end].strip()
            buffer = buffer[end:]
            if sentence:
                yield from _enforce_max_length(sentence)
    if buffer.strip():
        yield from _enforce_max_length(buffer.strip())


def _enforce_max_length(sentence: str):
    """Decoupe une phrase trop longue (>MAX_TTS_CHARS) sur les virgules, pour rester sous la limite XTTS."""
    if len(sentence) <= MAX_TTS_CHARS:
        yield sentence
        return

    parts = sentence.split("،")
    current = ""
    for part in parts:
        candidate = (current + "،" + part).strip("،").strip() if current else part.strip()
        if len(candidate) > MAX_TTS_CHARS and current:
            yield current.strip()
            current = part.strip()
        else:
            current = candidate
    if current:
        yield current.strip()


async def _stream_reply_to_client(websocket: WebSocket, session_id: str, user_text: str, tts_language: str) -> str:
    loop = asyncio.get_event_loop()
    queue: asyncio.Queue = asyncio.Queue()
    DONE = object()

    def producer():
        try:
            token_stream = chat_service.stream_chat_message(session_id, user_text)
            for sentence in _split_into_sentences(token_stream):
                t0 = time.time()
                audio_bytes = tts_engine.synthesize(sentence, tts_language)
                logger.info("[TTS] %.2fs pour phrase=%r", time.time() - t0, sentence)
                asyncio.run_coroutine_threadsafe(queue.put(("sentence", sentence, audio_bytes)), loop)
        except Exception as exc:  # noqa: BLE001
            asyncio.run_coroutine_threadsafe(queue.put(("error", str(exc), None)), loop)
        finally:
            asyncio.run_coroutine_threadsafe(queue.put((DONE, None, None)), loop)

    threading.Thread(target=producer, daemon=True).start()

    reply_parts: list[str] = []
    while True:
        kind, text, audio = await queue.get()
        if kind is DONE:
            break
        if kind == "error":
            await websocket.send_json({"type": "error", "stage": "llm_tts", "detail": text})
            break
        reply_parts.append(text)
        await websocket.send_json({"type": "sentence_text", "text": text})
        #logger.info("[TTS] phrase=%r taille_audio=%d bytes", text, len(audio))
        await websocket.send_bytes(audio)

    return "".join(reply_parts)

def _get_username_from_token(token: str | None) -> str | None:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload.get("sub")
    except JWTError:
        return None
    
@router.websocket("/ws")
async def voice_chat_ws(websocket: WebSocket):
    """
    ws://.../voice/ws?session_id=xxx&language=arabic&mode=full|transcribe
    mode=full (défaut) : STT -> LLM -> TTS, streaming phrase par phrase.
    mode=transcribe    : STT uniquement, renvoie {"type": "user_text", ...} et s'arrête là.
    """
    token = websocket.query_params.get("token")
    username = _get_username_from_token(token)

    if username is None:
        await websocket.close(code=4401)
        return
    
    await websocket.accept()

    session_id = websocket.query_params.get("session_id") or None
    language = websocket.query_params.get("language", "arabic")
    mode = websocket.query_params.get("mode", "full")
    tts_language = STT_TO_TTS_LANGUAGE.get(language, "ar")

    try:
        while True:
            audio_bytes = await websocket.receive_bytes()

            try:
                user_text = await asyncio.to_thread(stt_engine.transcribe, audio_bytes, language)
            except Exception as exc:  # noqa: BLE001
                await websocket.send_json({"type": "error", "stage": "stt", "detail": str(exc)})
                continue

            if not user_text or not user_text.strip():
                await websocket.send_json({"type": "error", "stage": "stt", "detail": "aucune parole détectée"})
                continue

            logger.info("[STT] session=%s texte=%s", session_id, user_text)

            # --- Court-circuit : mode transcription seule, on s'arrête ici ---
            if mode == "transcribe":
                await websocket.send_json({"type": "user_text", "text": user_text, "session_id": session_id or ""})
                continue

            # --- Mode full : la conversation est réellement créée/alimentée ici ---
            if session_id is None:
                session_id = await conversation_service.create_conversation(username, user_text)
            else:
                conversation = await conversation_service.get_conversation(session_id, username)
                if conversation is None:
                    session_id = await conversation_service.create_conversation(username, user_text)

            await websocket.send_json({"type": "user_text", "text": user_text, "session_id": session_id})

            if not tts_engine.is_ready:
                await websocket.send_json({"type": "error", "stage": "tts", "detail": "modele en cours de chargement"})
                continue

            full_reply = await _stream_reply_to_client(websocket, session_id, user_text, tts_language)
            logger.info("[LLM] session=%s reponse=%s", session_id, full_reply)

            await conversation_service.append_messages(session_id, username, user_text, full_reply)

            await websocket.send_json({"type": "done", "session_id": session_id, "full_reply": full_reply})

    except WebSocketDisconnect:
        logger.info("Client WS déconnecté (session=%s)", session_id)


@router.get("/health")
def voice_health():
    return {
        "status": "ok",
        "stt_loaded": stt_engine.is_loaded(),
        "tts_ready": tts_engine.is_ready,
    }


@router.post("/chat")
async def voice_chat(
    file: UploadFile = File(...),
    session_id: str | None = Form(None),
    language: str = Form("arabic"),
):
    session_id = session_id or str(uuid.uuid4())
    audio_bytes = await file.read()

    try:
        user_text = await asyncio.to_thread(stt_engine.transcribe, audio_bytes, language)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"[STT] audio illisible: {exc}")
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=f"[STT] {exc}")

    if not user_text or not user_text.strip():
        raise HTTPException(status_code=400, detail="[STT] aucune parole détectée")

    try:
        reply_text = await asyncio.to_thread(chat_service.send_chat_message, session_id, user_text)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=f"[LLM] {exc}")

    if not reply_text or not reply_text.strip():
        raise HTTPException(status_code=500, detail="[LLM] réponse vide")

    if not tts_engine.is_ready:
        raise HTTPException(status_code=503, detail="[TTS] modele en cours de chargement")

    tts_language = STT_TO_TTS_LANGUAGE.get(language, "ar")

    try:
        response_audio = await asyncio.to_thread(tts_engine.synthesize, reply_text, tts_language)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"[TTS] {exc}")

    return Response(
        content=response_audio,
        media_type="audio/wav",
        headers={
            "X-Session-Id": session_id,
            "X-User-Text": quote(user_text),
            "X-Response-Text": quote(reply_text),
        },
    )


@router.post("/reset")
def voice_reset(session_id: str = Form(...)):
    chat_service.reset_chat_session(session_id)
    return {"status": "ok"}