from fastapi import HTTPException, status
from passlib.exc import PasswordTruncateError

from app.core.security import hash_password, verify_password
from app.db.mongodb import users_collection
from app.models.user import UserCreate


class PasswordTooLongException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password too long (bcrypt limit is 72 bytes). Use a shorter password.",
        )


async def get_user_by_username(username: str):
    return await users_collection.find_one({"username": username})


async def create_user(user: UserCreate):
    try:
        hashed_password = hash_password(user.password)
    except (PasswordTruncateError, ValueError):
        # ValueError peut aussi arriver selon la version bcrypt
        raise PasswordTooLongException()

    db_user = {"username": user.username, "hashed_password": hashed_password}
    await users_collection.insert_one(db_user)
    return {"message": "User created successfully"}


async def authenticate_user(username: str, password: str):
    user = await get_user_by_username(username)
    if not user:
        return False
    if not verify_password(password, user["hashed_password"]):
        return False
    return user
