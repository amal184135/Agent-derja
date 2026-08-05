from fastapi import HTTPException, status
from passlib.exc import PasswordTruncateError
from bson import ObjectId
from datetime import date, datetime

from app.core.security import hash_password, verify_password
from app.db.mongodb import users_collection
from app.models.user import UserCreate, UserUpdate


class PasswordTooLongException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password too long (bcrypt limit is 72 bytes). Use a shorter password.",
        )

class UsernameTakenException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken",
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

async def get_user_by_id(user_id: str) -> dict | None:
    return await users_collection.find_one({"_id": ObjectId(user_id)})


async def update_user_profile(user_id: str, data: UserUpdate) -> dict | None:
    update_data = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}

    if "date_naissance" in update_data and isinstance(update_data["date_naissance"], date):
        update_data["date_naissance"] = datetime.combine(
            update_data["date_naissance"], datetime.min.time()
        )

    if update_data:
        await users_collection.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
    return await get_user_by_id(user_id)

async def change_user_password(user_id: str, current_password: str, new_password: str) -> bool:
    user = await get_user_by_id(user_id)
    if not user:
        return False
    if not verify_password(current_password, user["hashed_password"]):
        return False
    try:
        new_hashed = hash_password(new_password)
    except (PasswordTruncateError, ValueError):
        raise PasswordTooLongException()
    await users_collection.update_one(
        {"_id": ObjectId(user_id)}, {"$set": {"hashed_password": new_hashed}}
    )
    return True


async def authenticate_user(username: str, password: str):
    user = await get_user_by_username(username)
    if not user:
        return False
    if not verify_password(password, user["hashed_password"]):
        return False
    return user
