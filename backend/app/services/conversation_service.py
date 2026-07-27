import uuid
from datetime import datetime

from app.db.mongodb import conversations_collection


def make_title(message: str) -> str:
    text = message.strip().replace("\n", " ")
    return text[:40] + ("…" if len(text) > 40 else "")


async def create_conversation(username: str, first_message: str) -> str:
    session_id = str(uuid.uuid4())
    now = datetime.utcnow()
    await conversations_collection.insert_one(
        {
            "session_id": session_id,
            "username": username,
            "title": make_title(first_message),
            "messages": [],
            "created_at": now,
            "updated_at": now,
        }
    )
    return session_id


async def get_conversation(session_id: str, username: str) -> dict | None:
    return await conversations_collection.find_one(
        {"session_id": session_id, "username": username}
    )


async def append_messages(
    session_id: str, username: str, user_text: str, bot_text: str
) -> None:
    now = datetime.utcnow()
    await conversations_collection.update_one(
        {"session_id": session_id, "username": username},
        {
            "$push": {
                "messages": {
                    "$each": [
                        {"sender": "user", "text": user_text, "timestamp": now},
                        {"sender": "bot", "text": bot_text, "timestamp": now},
                    ]
                }
            },
            "$set": {"updated_at": now},
        },
    )


async def list_conversations(username: str) -> list[dict]:
    cursor = conversations_collection.find(
        {"username": username},
        {"session_id": 1, "title": 1, "updated_at": 1, "_id": 0},
    ).sort("updated_at", -1)
    return await cursor.to_list(length=200)


async def rename_conversation(session_id: str, username: str, new_title: str) -> bool:
    result = await conversations_collection.update_one(
        {"session_id": session_id, "username": username},
        {"$set": {"title": new_title, "updated_at": datetime.utcnow()}},
    )
    return result.matched_count > 0

async def delete_conversation(session_id: str, username: str) -> bool:
    result = await conversations_collection.delete_one(
        {"session_id": session_id, "username": username}
    )
    return result.deleted_count > 0