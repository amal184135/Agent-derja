from datetime import datetime
from typing import Optional

from bson import ObjectId
from pydantic import BaseModel, Field

from app.models.user import PyObjectId


class MessageModel(BaseModel):
    sender: str  # "user" | "bot"
    text: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ConversationModel(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    session_id: str
    username: str
    title: str = "Nouvelle discussion"
    messages: list[MessageModel] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        populate_by_name = True


class ConversationSummary(BaseModel):
    session_id: str
    title: str
    updated_at: datetime


class ConversationDetail(BaseModel):
    session_id: str
    title: str
    messages: list[MessageModel]