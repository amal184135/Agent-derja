import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services import chat_service

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None


class ChatResponse(BaseModel):
    reply: str
    session_id: str


class ResetRequest(BaseModel):
    session_id: str


@router.post("", response_model=ChatResponse)
def chat(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message vide")

    session_id = req.session_id or str(uuid.uuid4())

    try:
        reply = chat_service.send_chat_message(session_id, req.message)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return ChatResponse(reply=reply, session_id=session_id)


@router.post("/reset")
def reset(req: ResetRequest):
    chat_service.reset_chat_session(req.session_id)
    return {"status": "ok"}