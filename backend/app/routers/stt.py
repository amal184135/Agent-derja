from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from app.services.stt_service import engine

router = APIRouter(prefix="/stt", tags=["Speech to Text"])


@router.get("/health")
def health():
    return {"status": "ok", "device": engine.device, "model_loaded": engine.is_loaded()}


@router.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    language: str = Query(None, description="Langue pour la transcription, ex: 'arabic'"),
):
    audio_bytes = await file.read()
    try:
        text = engine.transcribe(audio_bytes, language=language)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Impossible de lire le fichier audio: {exc}")
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    return {"text": text}