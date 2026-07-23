from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import get_current_username
from app.models.conversation import ConversationDetail, ConversationSummary
from app.services import conversation_service

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("", response_model=list[ConversationSummary])
async def get_conversations(username: str = Depends(get_current_username)):
    return await conversation_service.list_conversations(username)


@router.get("/{session_id}", response_model=ConversationDetail)
async def get_conversation(
    session_id: str, username: str = Depends(get_current_username)
):
    conversation = await conversation_service.get_conversation(session_id, username)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation introuvable")
    return conversation


@router.delete("/{session_id}")
async def delete_conversation(
    session_id: str, username: str = Depends(get_current_username)
):
    deleted = await conversation_service.delete_conversation(session_id, username)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation introuvable")
    return {"status": "ok"}