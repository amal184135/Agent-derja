from app.clients import gemini_client


def send_chat_message(session_id: str, message: str) -> str:
    return gemini_client.send_message(session_id, message)


def reset_chat_session(session_id: str) -> None:
    gemini_client.reset_chat(session_id)