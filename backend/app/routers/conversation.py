from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import get_current_username
from app.models.conversation import ConversationDetail, ConversationSummary, RenameRequest
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

@router.patch("/{session_id}")
async def rename_conversation(
    session_id: str, body: RenameRequest, username: str = Depends(get_current_username)
):
    title = body.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Le titre ne peut pas être vide")

    updated = await conversation_service.rename_conversation(session_id, username, title)
    if not updated:
        raise HTTPException(status_code=404, detail="Conversation introuvable")
    return {"status": "ok"}

@router.delete("/{session_id}")
async def delete_conversation(
    session_id: str, username: str = Depends(get_current_username)
):
    deleted = await conversation_service.delete_conversation(session_id, username)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation introuvable")
    return {"status": "ok"}