from fastapi import Depends

from app.routers.auth import verify_token


async def get_current_username(payload: dict = Depends(verify_token)) -> str:
    return payload["sub"]