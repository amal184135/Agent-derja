from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.deps import get_current_username
from app.services import chat_service, conversation_service

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
async def chat(req: ChatRequest, username: str = Depends(get_current_username)):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message vide")

    session_id = req.session_id

    if session_id:
        conversation = await conversation_service.get_conversation(session_id, username)
        if conversation is None:
            raise HTTPException(status_code=404, detail="Conversation introuvable")
    else:
        session_id = await conversation_service.create_conversation(username, req.message)

    try:
        reply = chat_service.send_chat_message(session_id, req.message)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    await conversation_service.append_messages(session_id, username, req.message, reply)

    return ChatResponse(reply=reply, session_id=session_id)


@router.post("/reset")
async def reset(req: ResetRequest, username: str = Depends(get_current_username)):
    conversation = await conversation_service.get_conversation(req.session_id, username)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation introuvable")
    chat_service.reset_chat_session(req.session_id)
    return {"status": "ok"}