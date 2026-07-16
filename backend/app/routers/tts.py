from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.models.tts import TTSRequest
from app.services.tts_service import engine

router = APIRouter(prefix="/tts", tags=["tts"])


@router.get("/health")
def tts_health():
    return {"status": "ok" if engine.is_ready else "loading", "device": engine.device}


@router.post("", response_class=Response, responses={200: {"content": {"audio/wav": {}}}})
def synthesize(request: TTSRequest):
    if not engine.is_ready:
        raise HTTPException(status_code=503, detail="Le modele est en cours de chargement")

    try:
        audio_bytes = engine.synthesize(request.text, request.language)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return Response(content=audio_bytes, media_type="audio/wav")