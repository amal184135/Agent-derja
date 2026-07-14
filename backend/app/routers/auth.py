from datetime import timedelta

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm

from app.core.config import settings
from app.core.security import create_access_token
from app.dependencies.auth import verify_token
from app.exceptions import InvalidCredentialsException, UserAlreadyExistsException
from app.models.user import UserCreate
from app.services.auth_service import authenticate_user, create_user, get_user_by_username

router = APIRouter(tags=["auth"])


@router.post("/register")
async def register_user(user: UserCreate):
    db_user = await get_user_by_username(user.username)
    if db_user:
        raise UserAlreadyExistsException()
    return await create_user(user)


@router.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise InvalidCredentialsException()

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user["username"]},
        expires_delta=access_token_expires,
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/verify-token")
async def verify_user_token(payload: dict = Depends(verify_token)):
    return {"message": "Token is valid"}
